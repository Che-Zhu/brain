"use client";

import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import { useMemo, useState } from "react";

const MOCK_GITHUB_REPOS: GithubDeployerRepo[] = [
  { fullName: "acme/sealai-ui", id: "repo-ui", name: "sealai-ui" },
  { fullName: "acme/platform-api", id: "repo-api", name: "platform-api" },
  { fullName: "acme/observability", id: "repo-obs", name: "observability" },
];

export default function ProjectCreatorPreview() {
  const [last, setLast] = useState<string | null>(null);

  const githubDeployer = useMemo(
    () => ({
      actions: {
        onAuthorize: () => setLast("github authorize (preview — noop handler)"),
        onDeploy: (repo: GithubDeployerRepo) => {
          setLast(`github deploy: ${repo.fullName ?? repo.name}`);
        },
      },
      states: {
        deployedRepo: null,
        githubToken: "preview-token",
        isLoading: false,
        repos: MOCK_GITHUB_REPOS,
      },
    }),
    []
  );

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="New project flow (preset)">
        <div className="flex flex-col gap-4">
          <ProjectCreator.Root
            actions={{
              onDatabaseConfirm: (id, name) =>
                setLast(`database:${name}:${id}`),
              onDockerConfirm: (ref, name) => setLast(`docker:${name}:${ref}`),
            }}
            existingProjectDisplayNames={["Existing Project"]}
            githubDeployer={githubDeployer}
          >
            <ProjectCreator.Variant1 className="w-full min-w-0 max-w-md rounded-xl border border-border bg-card p-4" />
          </ProjectCreator.Root>
          {last ? (
            <p className="text-muted-foreground text-xs">
              Last confirm:{" "}
              <span className="font-mono text-foreground">{last}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Enter a project name, pick a source, confirm, or go back.
            </p>
          )}
        </div>
      </Preview>
      <Preview showReset={false} title="Composable (custom shell)">
        <ProjectCreator.Root githubDeployer={githubDeployer}>
          <div className="w-full min-w-0 max-w-md rounded-xl border border-border bg-muted/30 p-4">
            <ProjectCreator.Trail className="mb-4" />
            <ProjectCreator.Stage />
          </div>
        </ProjectCreator.Root>
      </Preview>
    </PreviewWrapper>
  );
}
