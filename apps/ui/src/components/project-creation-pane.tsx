"use client";

import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import type { ProjectCreatorRootProps } from "@workspace/ui/components/project-creator/project-creator.context";
import { SidePane } from "@workspace/ui/components/side-pane";
import { Plus } from "lucide-react";

export function ProjectCreationPane({
  busy = false,
  creatorRootProps,
  onClose,
  resetKey,
}: {
  busy?: boolean;
  creatorRootProps: Pick<
    ProjectCreatorRootProps,
    | "actions"
    | "confirmApplying"
    | "databaseOptions"
    | "existingProjectDisplayNames"
    | "githubDeployer"
  >;
  onClose: () => void;
  resetKey: string | number;
}) {
  return (
    <SidePane
      busy={busy}
      closeAriaLabel="Close project creation pane"
      icon={<Plus aria-hidden className="size-4" />}
      label="Project creation pane"
      onClose={onClose}
      subtitle="Provide a project name and select the project creation method."
      title="Create New Project"
    >
      <ProjectCreator.Root key={resetKey} {...creatorRootProps}>
        <ProjectCreator.Variant1 className="min-w-0" />
      </ProjectCreator.Root>
    </SidePane>
  );
}
