"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import {
  ProjectExplorer,
  type ProjectExplorerProject,
} from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { encodedKubeconfigAtom, namespaceAtom } from "@/atom/auth-atom";
import { toastCopyableProjectShareLink } from "@/components/sonner";
import {
  buildPreviewProjectShareUrl,
  projectShareResponseFromJson,
  readNamespaceFromProjectShareJwt,
} from "@/lib/project-share";
import { projectsListToExplorerProjects } from "@/lib/projects-to-explorer-projects";

export default function ProjectIndexPage() {
  const router = useRouter();
  const kubeconfig = useAtomValue(encodedKubeconfigAtom).trim();
  const namespace = useAtomValue(namespaceAtom);
  const hasKubeconfig = kubeconfig !== "";
  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "projects",
        ...(namespace ? { namespace } : {}),
      }),
    [namespace]
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

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-6">
      <ProjectExplorer.Root
        actions={{
          onProjectClick: (p) =>
            router.push(`/project/${encodeURIComponent(p.id)}`),
          onProjectPublicChange: async (p, isPublic) => {
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
                ...(namespace != null && namespace !== "" ? { namespace } : {}),
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
                  ...(namespace != null && namespace !== ""
                    ? { ns: namespace }
                    : {}),
                },
                header: {
                  Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
                },
              });
              const { token } = projectShareResponseFromJson(raw);
              const fromJwt = readNamespaceFromProjectShareJwt(token);
              const ns = fromJwt ?? namespace?.trim() ?? "";
              if (ns === "") {
                throw new Error(
                  "Could not determine namespace for preview link. Set a namespace, then make the project public again."
                );
              }
              const origin = window.location.origin;
              const shareUrl = buildPreviewProjectShareUrl({
                origin,
                projectUid: p.id,
                namespace: ns,
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
        }}
        states={{ projects: projects ?? [] }}
      >
        <ProjectExplorer.Variant0 className="min-w-2xl flex-1" />
      </ProjectExplorer.Root>
    </div>
  );
}
