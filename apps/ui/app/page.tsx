"use client";

import { useK8SGet } from "@workspace/api/hooks/use-k8s-get";
import { ProjectExplorer } from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { devEncodedKubeconfigAtom, devNamespaceAtom } from "@/atom/auth-atom";
import { instancesListToExplorerProjects } from "@/lib/instances-to-explorer-projects";

export default function Page() {
  const router = useRouter();
  const kubeconfig = useAtomValue(devEncodedKubeconfigAtom);
  const namespace = useAtomValue(devNamespaceAtom);
  const getParams = useMemo(
    () => ({
      kind: "instance",
      ...(namespace ? { namespace } : {}),
    }),
    [namespace]
  );
  const { data } = useK8SGet(kubeconfig, getParams);
  const projects = useMemo(() => instancesListToExplorerProjects(data), [data]);

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center gap-4 p-6">
      <ProjectExplorer.Root
        actions={{
          onProjectClick: (p) =>
            router.push(`/project/${encodeURIComponent(p.id)}`),
        }}
        states={{ projects }}
      >
        <ProjectExplorer.Variant0 className="min-w-2xl flex-1" />
      </ProjectExplorer.Root>
    </div>
  );
}
