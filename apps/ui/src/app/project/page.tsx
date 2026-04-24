"use client";

import { ProjectExplorer } from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";

import { useProjectsExplorer } from "@/hooks/use-projects-explorer";
import { encodedKubeconfigAtom, namespaceAtom } from "@/store/auth-store";

export default function ProjectIndexPage() {
  const kubeconfig = useAtomValue(encodedKubeconfigAtom).trim();
  const ns = useAtomValue(namespaceAtom);
  const { actions, states } = useProjectsExplorer({ kubeconfig, ns });

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-6">
      <ProjectExplorer.Root actions={actions} states={states}>
        <ProjectExplorer.Variant0 className="min-w-2xl flex-1" />
      </ProjectExplorer.Root>
    </div>
  );
}
