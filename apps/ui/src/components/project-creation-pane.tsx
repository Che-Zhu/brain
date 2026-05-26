"use client";

import { GithubDeployer } from "@workspace/ui/components/github-deployer/github-deployer";
import type { GithubDeployerStates } from "@workspace/ui/components/github-deployer/github-deployer.types";
import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import type { ProjectCreatorRootProps } from "@workspace/ui/components/project-creator/project-creator.context";
import { SidePane } from "@workspace/ui/components/side-pane";
import { Plus } from "lucide-react";
import type { ProjectCreationPaneEntryMode } from "./project-creation-pane-state";

export type { ProjectCreationPaneEntryMode } from "./project-creation-pane-state";

const EMPTY_GITHUB_DEPLOYER_STATES: GithubDeployerStates = {
  deployedRepo: null,
  githubToken: null,
  isLoading: false,
  repos: [],
};

export function ProjectCreationPane({
  busy = false,
  creatorRootProps,
  entryMode = "general",
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
  entryMode?: ProjectCreationPaneEntryMode;
  onClose: () => void;
  resetKey: string | number;
}) {
  const githubDeployer = creatorRootProps.githubDeployer;
  const directGithubEntry = entryMode === "githubDirect";

  return (
    <SidePane
      busy={busy}
      closeAriaLabel="Close project creation pane"
      icon={<Plus aria-hidden className="size-4 text-theme-blue" />}
      label="Project creation pane"
      onClose={onClose}
      subtitle={
        directGithubEntry
          ? "Select a GitHub repository to create a project."
          : "Provide a project name and select the project creation method."
      }
      title="Create New Project"
    >
      {directGithubEntry ? (
        <div
          className="min-w-0"
          data-slot="project-creation-pane-github-direct"
          key={resetKey}
        >
          <GithubDeployer.Root
            actions={githubDeployer?.actions}
            states={githubDeployer?.states ?? EMPTY_GITHUB_DEPLOYER_STATES}
          >
            <GithubDeployer.Shell className="gap-3">
              <GithubDeployer.Title />
              <GithubDeployer.Subtitle />
              <GithubDeployer.AuthButton />
              <GithubDeployer.RepoSelect />
              <GithubDeployer.Complete />
            </GithubDeployer.Shell>
          </GithubDeployer.Root>
        </div>
      ) : (
        <ProjectCreator.Root key={resetKey} {...creatorRootProps}>
          <ProjectCreator.Variant1 className="min-w-0" />
        </ProjectCreator.Root>
      )}
    </SidePane>
  );
}
