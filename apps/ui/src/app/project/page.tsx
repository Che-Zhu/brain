"use client";

import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import { ProjectExplorer } from "@workspace/ui/components/project-explorer/project-explorer";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useProjectCreator } from "@/hooks/use-project-creator";
import { useProjectsExplorer } from "@/hooks/use-projects-explorer";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

export default function ProjectIndexPage() {
  const router = useRouter();
  const kubeconfig = useAtomValue(kubeconfigAtom).trim();
  const ns = useAtomValue(namespaceAtom);

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
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-slot="project-index-background"
      >
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--color-zinc-600) 72%, transparent) 0.5px, transparent 0.5px)",
            backgroundPosition: "24px 0",
            backgroundSize: "32px 41px",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 58%, transparent 94%)",
          }}
        />
        <div
          className="absolute inset-0 z-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 50% 100%, color-mix(in oklab, var(--color-blue-500) 22%, transparent), transparent 70%)",
          }}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-4 px-[52px] pt-[52px] pb-6">
        <ProjectExplorer.Root actions={explorerActions} states={states}>
          <ProjectExplorer.Variant1
            className="w-full min-w-0 max-w-6xl flex-1"
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
