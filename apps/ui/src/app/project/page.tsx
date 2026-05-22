"use client";

import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import { ProjectExplorer } from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";
import { PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useProjectCreator } from "@/hooks/use-project-creator";
import { useProjectsExplorer } from "@/hooks/use-projects-explorer";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { openRightPane, rightPaneOpenAtom } from "@/store/layout-store";

export default function ProjectIndexPage() {
  const router = useRouter();
  const kubeconfig = useAtomValue(kubeconfigAtom).trim();
  const ns = useAtomValue(namespaceAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);

  const { actions, states, refreshProjects } = useProjectsExplorer({
    kubeconfig,
    ns,
  });

  const onProjectCreated = useCallback(
    async (projectUid: string | undefined) => {
      await refreshProjects();
      if (projectUid) {
        router.push(`/project/${encodeURIComponent(projectUid)}`);
      }
    },
    [refreshProjects, router]
  );

  const {
    creatorRootProps,
    dialogOpen,
    githubDeployerLoading,
    onDialogOpenChange,
    openDialog,
  } = useProjectCreator({
    kubeconfig,
    namespace: ns,
    onProjectCreated,
  });

  const explorerActions = useMemo(
    () => ({ ...actions, onNewProject: openDialog }),
    [actions, openDialog]
  );

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
        <ProjectExplorer.Root actions={explorerActions} states={states}>
          <ProjectExplorer.Variant1
            className="w-full min-w-0 max-w-4xl flex-1"
            headerDescription="View existing projects or create a new one."
          />
        </ProjectExplorer.Root>
      </div>

      <Dialog onOpenChange={onDialogOpenChange} open={dialogOpen}>
        <DialogContent
          aria-busy={dialogOpen && githubDeployerLoading}
          className="border-none bg-transparent p-0 ring-0 sm:max-w-lg"
        >
          {/* <DialogHeader /> */}
          {dialogOpen ? (
            <ProjectCreator.Root {...creatorRootProps}>
              <ProjectCreator.Variant1 className="min-w-0 rounded-xl border border-border bg-card p-4" />
            </ProjectCreator.Root>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
