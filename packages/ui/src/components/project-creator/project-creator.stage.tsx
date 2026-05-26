"use client";

import { Button } from "@workspace/ui/components/button";
import { DatabaseDeployer } from "@workspace/ui/components/database-deployer";
import { GithubDeployer } from "@workspace/ui/components/github-deployer/github-deployer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";
import { useState } from "react";

import { useProjectCreator } from "./project-creator.context";
import { ProjectCreatorOptionPicker } from "./project-creator.pick";
import type {
  ProjectCreatorDatabaseChoice,
  ProjectCreatorSourceKind,
} from "./project-creator.types";

function GithubPanel() {
  const {
    meta: { githubDeployer },
  } = useProjectCreator();

  const states = githubDeployer?.states ?? {
    deployedRepo: null,
    githubToken: null as string | null,
    isLoading: false,
    repos: [] as const,
  };
  const actions = githubDeployer?.actions ?? {};

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-slot="project-creator-github"
    >
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

function DockerPanel() {
  const { actions, states } = useProjectCreator();
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const projectDisplayName = states.projectDisplayName.trim();
  const busy = states.confirmApplying;
  const disabled = trimmed.length === 0 || busy;

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-slot="project-creator-docker"
    >
      <Label htmlFor="project-creator-docker-ref">Docker image</Label>
      <Input
        autoComplete="off"
        className="w-full min-w-0"
        id="project-creator-docker-ref"
        onChange={(e) => setValue(e.target.value)}
        placeholder="ghcr.io/org/image:tag"
        value={value}
      />
      <div className="flex justify-end">
        <Button
          aria-busy={busy}
          disabled={disabled}
          onClick={() => actions.onDockerConfirm?.(trimmed, projectDisplayName)}
          type="button"
        >
          {busy ? (
            <Spinner aria-hidden className="size-4 shrink-0" />
          ) : (
            "Confirm"
          )}
        </Button>
      </div>
    </div>
  );
}

function DatabasePanel({
  databaseOptions,
}: {
  databaseOptions: ProjectCreatorDatabaseChoice[];
}) {
  const { actions, states } = useProjectCreator();
  const busy = states.confirmApplying;
  const projectDisplayName = states.projectDisplayName.trim();

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-slot="project-creator-database"
    >
      <DatabaseDeployer
        busy={busy}
        databaseOptions={databaseOptions}
        onDeploy={(settings) => {
          const error = actions.validateProjectDisplayName(projectDisplayName);
          if (error != null) {
            return;
          }
          actions.onDatabaseConfirm?.(settings, projectDisplayName);
        }}
      />
    </div>
  );
}

function renderActivePanel(
  step: ProjectCreatorSourceKind,
  databaseOptions: ProjectCreatorDatabaseChoice[]
) {
  switch (step) {
    case "github":
      return <GithubPanel />;
    case "docker-image":
      return <DockerPanel />;
    case "database":
      return <DatabasePanel databaseOptions={databaseOptions} />;
    default:
      return null;
  }
}

export function ProjectCreatorStage({ className }: { className?: string }) {
  const {
    meta: { databaseOptions },
    states: { step },
  } = useProjectCreator("ProjectCreator.Stage");

  return (
    <div className={className} data-slot="project-creator-stage">
      {step === null ? (
        <ProjectCreatorOptionPicker />
      ) : (
        renderActivePanel(step, databaseOptions)
      )}
    </div>
  );
}
