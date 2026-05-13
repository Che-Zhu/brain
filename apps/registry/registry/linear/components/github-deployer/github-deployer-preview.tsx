"use client";

import { GithubDeployer } from "@workspace/ui/components/github-deployer/github-deployer";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";

const REPOS = [
  { fullName: "acme/sealai-ui", id: "repo-ui", name: "sealai-ui" },
  { fullName: "acme/platform-api", id: "repo-api", name: "platform-api" },
  { fullName: "acme/observability", id: "repo-obs", name: "observability" },
] as const;

function DeployerCard({
  states,
}: {
  states: {
    deployedRepo?: (typeof REPOS)[number] | null;
    githubToken?: string | null;
    isLoading?: boolean;
    repos: readonly (typeof REPOS)[number][];
  };
}) {
  return (
    <GithubDeployer.Root
      actions={{
        onAuthorize: () => undefined,
        onDeploy: (_repo) => undefined,
      }}
      states={states}
    >
      <GithubDeployer.Shell>
        <GithubDeployer.Title />
        <GithubDeployer.Subtitle />
        <GithubDeployer.AuthButton />
        <GithubDeployer.RepoSelect />
        <GithubDeployer.Complete />
      </GithubDeployer.Shell>
    </GithubDeployer.Root>
  );
}

export default function GithubDeployerPreview() {
  const cardChrome =
    "max-w-md rounded-xl border border-border bg-background p-4";

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="Authorizing — no token yet">
        <div className={cardChrome}>
          <DeployerCard
            states={{
              githubToken: null,
              isLoading: true,
              repos: REPOS,
            }}
          />
        </div>
      </Preview>
      <Preview title="Unauthorized — OAuth link">
        <div className={cardChrome}>
          <DeployerCard
            states={{
              githubToken: null,
              isLoading: false,
              repos: REPOS,
            }}
          />
        </div>
      </Preview>
      <Preview title="Selecting repo — token present">
        <div className={cardChrome}>
          <DeployerCard
            states={{
              githubToken: "gho_preview",
              isLoading: false,
              repos: REPOS,
            }}
          />
        </div>
      </Preview>
      <Preview title="Complete — deployedRepo set">
        <div className={cardChrome}>
          <DeployerCard
            states={{
              githubToken: "gho_preview",
              isLoading: false,
              repos: REPOS,
              deployedRepo: REPOS[0],
            }}
          />
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
