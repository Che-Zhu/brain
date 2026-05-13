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
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import {
  PROJECT_DISPLAY_NAME_ANNOTATION_KEY,
  projectsListToExplorerProjects,
} from "@/lib/projects-to-explorer-projects";
import { openRightPane } from "@/store/layout-store";

function projectResourceName(p: ProjectExplorerProject): string {
  return p.resourceName ?? p.name;
}

export function useProjectsExplorer(options: {
  /** URL-encoded kubeconfig string (Bearer token body). */
  kubeconfig: string;
  /** Kubernetes namespace for list / patch / delete calls. */
  ns: string;
  /** When set, replaces the default “open assistant pane” handler for New Project. */
  onNewProject?: () => void;
}): {
  actions: ProjectExplorerActions;
  states: ProjectExplorerStates;
  /** Revalidate the projects list (e.g. after creating a project). */
  refreshProjects: () => Promise<ProjectExplorerProject[] | undefined>;
} {
  const router = useRouter();
  const pathname = usePathname();
  const kubeconfig = options.kubeconfig.trim();
  const ns = options.ns;
  const onNewProjectOverride = options.onNewProject;
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

  const onNewProject = useCallback(() => {
    if (onNewProjectOverride) {
      onNewProjectOverride();
      return;
    }
    openRightPane();
  }, [onNewProjectOverride]);

  const onProjectRename = useCallback(
    async (p: ProjectExplorerProject, newDisplayName: string) => {
      if (!hasKubeconfig) {
        toast.error("Credentials are not ready yet.");
        throw new Error("not ready");
      }
      try {
        await fetcher({
          base: ApiUrl(),
          path: API_ROUTES.k8s.patch,
          query: {
            kind: "projects",
            name: projectResourceName(p),
            type: "merge",
            ...(ns === "" ? {} : { namespace: ns }),
          },
          method: "PATCH",
          body: {
            metadata: {
              annotations: {
                [PROJECT_DISPLAY_NAME_ANNOTATION_KEY]: newDisplayName,
              },
            },
          },
          header: {
            Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
          },
        });
        await mutate();
        toast.success(`Project renamed to "${newDisplayName}".`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Rename failed";
        toast.error(msg);
        throw e;
      }
    },
    [hasKubeconfig, kubeconfig, mutate, ns]
  );

  const onProjectDelete = useCallback(
    async (p: ProjectExplorerProject) => {
      if (!hasKubeconfig) {
        toast.error("Credentials are not ready yet.");
        throw new Error("not ready");
      }
      try {
        await fetcher({
          base: ApiUrl(),
          path: API_ROUTES.k8s.delete,
          query: {
            kind: "projects",
            name: projectResourceName(p),
            ...(ns === "" ? {} : { namespace: ns }),
          },
          method: "DELETE",
          header: {
            Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
          },
        });
        await mutate();
        toast.success(`Deleted "${p.name}".`);
        const uidEnc = encodeURIComponent(p.id);
        if (pathname === `/project/${uidEnc}`) {
          router.push("/project");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        toast.error(msg);
        throw e;
      }
    },
    [hasKubeconfig, kubeconfig, mutate, ns, pathname, router]
  );

  const actions = useMemo(
    (): ProjectExplorerActions => ({
      onNewProject,
      onProjectClick,
      onProjectDelete,
      onProjectRename,
    }),
    [onNewProject, onProjectClick, onProjectDelete, onProjectRename]
  );

  return { actions, states, refreshProjects: mutate };
}
