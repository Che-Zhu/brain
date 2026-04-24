"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import type {
  ProjectExplorerActions,
  ProjectExplorerProject,
  ProjectExplorerStates,
} from "@workspace/ui/components/project-explorer/project-explorer";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { toastCopyableProjectShareLink } from "@/components/sonner";
import {
  buildPreviewProjectShareUrl,
  projectShareResponseFromJson,
  readNamespaceFromProjectShareJwt,
} from "@/lib/project-share";
import { projectsListToExplorerProjects } from "@/lib/projects-to-explorer-projects";

export function useProjectsExplorer(options: {
  /** URL-encoded kubeconfig string (Bearer token body). */
  kubeconfig: string;
  /** Kubernetes namespace for list / patch / share calls. */
  ns: string;
}): {
  actions: ProjectExplorerActions;
  states: ProjectExplorerStates;
} {
  const router = useRouter();
  const kubeconfig = options.kubeconfig.trim();
  const ns = options.ns;
  const hasKubeconfig = kubeconfig !== "";

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "projects",
        ...(ns ? { namespace: ns } : {}),
      }),
    [ns]
  );

  const { data: projects, mutate } = useSWR(
    hasKubeconfig ? ([API_ROUTES.k8s.get, getParams] as const) : null,
    () =>
      fetcher<ProjectExplorerProject[]>({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query: { ...getParams },
        header: {
          Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
        },
        method: "GET",
        select: (raw) =>
          projectsListToExplorerProjects(k8sGetResponseSchema.parse(raw)),
      })
  );

  const states = useMemo(
    (): ProjectExplorerStates => ({
      projects: projects ?? [],
    }),
    [projects]
  );

  const onProjectClick = useCallback(
    (p: ProjectExplorerProject) => {
      router.push(`/project/${encodeURIComponent(p.id)}`);
    },
    [router]
  );

  const onProjectPublicChange = useCallback(
    async (p: ProjectExplorerProject, isPublic: boolean) => {
      if (!hasKubeconfig) {
        toast.error("Credentials are not ready yet.");
        return;
      }
      await fetcher({
        base: ApiUrl(),
        path: API_ROUTES.k8s.patch,
        query: {
          kind: "projects",
          name: p.name,
          type: "merge",
          ...(ns === "" ? {} : { namespace: ns }),
        },
        method: "PATCH",
        body: { spec: { public: isPublic } },
        header: {
          Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
        },
      });
      await mutate();
      if (!isPublic) {
        toast.info(
          `"${p.name}" has been set as private. Shared preview links for this project no longer work.`
        );
        return;
      }
      const loading = toast.loading("Preparing share link…");
      try {
        const raw = await fetcher<unknown>({
          base: ApiUrl(),
          path: API_ROUTES.projects.share,
          method: "POST",
          body: {
            projectName: p.name,
            projectUid: p.id,
            permission: "view",
            ...(ns === "" ? {} : { ns }),
          },
          header: {
            Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
          },
        });
        const { token } = projectShareResponseFromJson(raw);
        const fromJwt = readNamespaceFromProjectShareJwt(token);
        const previewNs = fromJwt ?? ns.trim();
        if (previewNs === "") {
          throw new Error(
            "Could not determine namespace for preview link. Set a namespace, then make the project public again."
          );
        }
        const origin = window.location.origin;
        const shareUrl = buildPreviewProjectShareUrl({
          origin,
          projectUid: p.id,
          namespace: previewNs,
          shareToken: token,
        });
        toast.dismiss(loading);
        toastCopyableProjectShareLink(shareUrl, { projectName: p.name });
      } catch (e) {
        toast.dismiss(loading);
        const msg = e instanceof Error ? e.message : "Share link failed";
        toast.error(msg);
      }
    },
    [hasKubeconfig, kubeconfig, mutate, ns]
  );

  const actions = useMemo(
    (): ProjectExplorerActions => ({
      onProjectClick,
      onProjectPublicChange,
    }),
    [onProjectClick, onProjectPublicChange]
  );

  return { actions, states };
}
