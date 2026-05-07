"use client";

import { GithubDeployer } from "@workspace/ui/components/github-deployer/github-deployer";
import type {
  GithubDeployerRepo,
  GithubDeployerStates,
} from "@workspace/ui/components/github-deployer/github-deployer.types";
import { useCallback, useMemo, useState } from "react";

import { useGithubRepos } from "@/hooks/use-github-repos";

export interface ProjectTranscriptGithubDeployerProps {
  authLoading: boolean;
  githubToken: string | undefined;
  /** Opens GitHub OAuth when the user is not yet authorized (cluster `ghcr-cred`). */
  onAuthorize: () => void;
  onDeployed: (repo: GithubDeployerRepo) => void;
}

/** GitHub deployer anchored in the chat transcript footer; uses cluster PAT + live repo list. */
export function ProjectTranscriptGithubDeployer({
  githubToken,
  authLoading,
  onAuthorize,
  onDeployed,
}: ProjectTranscriptGithubDeployerProps) {
  const { isLoading: reposLoading, repos } = useGithubRepos(githubToken);
  const [deployedRepo, setDeployedRepo] = useState<GithubDeployerRepo | null>(
    null
  );

  const states: GithubDeployerStates = useMemo(
    () => ({
      deployedRepo,
      githubToken: githubToken ?? "",
      isLoading: authLoading || (!!githubToken?.trim() && reposLoading),
      repos,
    }),
    [authLoading, deployedRepo, githubToken, repos, reposLoading]
  );

  const handleDeploy = useCallback(
    (repo: GithubDeployerRepo) => {
      setDeployedRepo(repo);
      onDeployed(repo);
    },
    [onDeployed]
  );

  const actions = useMemo(
    () => ({
      onAuthorize,
      onDeploy: handleDeploy,
    }),
    [handleDeploy, onAuthorize]
  );

  return (
    <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
      <GithubDeployer.Root actions={actions} states={states}>
        <GithubDeployer.Shell className="gap-3">
          <GithubDeployer.Title />
          <GithubDeployer.Subtitle />
          <GithubDeployer.AuthButton />
          <GithubDeployer.RepoSelect />
          <GithubDeployer.Complete />
        </GithubDeployer.Shell>
      </GithubDeployer.Root>
    </div>
  );
}
