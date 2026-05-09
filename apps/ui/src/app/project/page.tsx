"use client";

import { Button } from "@workspace/ui/components/button";
import { ProjectExplorer } from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";
import { PanelRightOpen } from "lucide-react";

import { useProjectsExplorer } from "@/hooks/use-projects-explorer";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { openRightPane, rightPaneOpenAtom } from "@/store/layout-store";

export default function ProjectIndexPage() {
  const kubeconfig = useAtomValue(kubeconfigAtom).trim();
  const ns = useAtomValue(namespaceAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const { actions, states } = useProjectsExplorer({ kubeconfig, ns });

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {rightPaneOpen ? null : (
        <div
          className="pointer-events-auto absolute top-2 right-2 z-10 flex items-center gap-2"
          data-slot="project-index-upper-right"
        >
          <Button
            aria-label="Open assistant panel"
            className="hoverable rounded-xl"
            onClick={openRightPane}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <PanelRightOpen aria-hidden className="size-4" strokeWidth={2} />
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-6">
        <ProjectExplorer.Root actions={actions} states={states}>
          <ProjectExplorer.Variant1 className="w-full min-w-0 max-w-2xl flex-1" />
        </ProjectExplorer.Root>
      </div>
    </div>
  );
}
