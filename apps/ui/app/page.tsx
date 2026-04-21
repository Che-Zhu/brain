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
import useSWR from "swr";
import { devEncodedKubeconfigAtom, devNamespaceAtom } from "@/atom/auth-atom";
import { projectsListToExplorerProjects } from "@/lib/projects-to-explorer-projects";

export default function Page() {
  const router = useRouter();
  const kubeconfig = useAtomValue(devEncodedKubeconfigAtom);
  const namespace = useAtomValue(devNamespaceAtom);
  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "projects",
        ...(namespace ? { namespace } : {}),
      }),
    [namespace]
  );

  const { data: projects } = useSWR(API_ROUTES.k8s.get, () =>
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
    <div className="flex min-h-svh flex-1 flex-col items-center gap-4 p-6">
      <ProjectExplorer.Root
        actions={{
          onProjectClick: (p) =>
            router.push(`/project/${encodeURIComponent(p.id)}`),
        }}
        states={{ projects: projects ?? [] }}
      >
        <ProjectExplorer.Variant0 className="min-w-2xl flex-1" />
      </ProjectExplorer.Root>
    </div>
  );
}
