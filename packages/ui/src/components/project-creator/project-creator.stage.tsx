"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState } from "react";

import { useProjectCreator } from "./project-creator.context";
import { ProjectCreatorOptionPicker } from "./project-creator.pick";
import type {
  ProjectCreatorDatabaseChoice,
  ProjectCreatorSourceKind,
} from "./project-creator.types";

function GithubPanel() {
  const { actions } = useProjectCreator();
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const disabled = trimmed.length === 0;

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-slot="project-creator-github"
    >
      <Label htmlFor="project-creator-github-url">Repository URL</Label>
      <Input
        autoComplete="off"
        className="w-full min-w-0"
        id="project-creator-github-url"
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://github.com/org/repo"
        value={value}
      />
      <div className="flex justify-end">
        <Button
          disabled={disabled}
          onClick={() => actions.onGithubConfirm?.(trimmed)}
          type="button"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

function DockerPanel() {
  const { actions } = useProjectCreator();
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const disabled = trimmed.length === 0;

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
          disabled={disabled}
          onClick={() => actions.onDockerConfirm?.(trimmed)}
          type="button"
        >
          Confirm
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
  const { actions } = useProjectCreator();

  const [selected, setSelected] = useState<ProjectCreatorDatabaseChoice | null>(
    null
  );

  const items = databaseOptions;

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-slot="project-creator-database"
    >
      <Label className="sr-only" htmlFor="project-creator-db-combobox-input">
        Database type
      </Label>
      <div className="w-full min-w-0">
        <Combobox<ProjectCreatorDatabaseChoice>
          autoHighlight
          isItemEqualToValue={(a, b) => a.id === b.id}
          items={items}
          itemToStringLabel={(db) => db.label}
          itemToStringValue={(db) => db.id}
          onValueChange={(next) => setSelected(next)}
          value={selected}
        >
          <ComboboxInput
            className="w-full"
            id="project-creator-db-combobox-input"
            placeholder="Choose a database…"
          />
          <ComboboxContent>
            <ComboboxEmpty>No matching database.</ComboboxEmpty>
            <ComboboxList>
              {(db) => (
                <ComboboxItem key={db.id} value={db}>
                  {db.iconUrl ? (
                    <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden">
                      <img
                        alt=""
                        className="size-4 object-contain"
                        decoding="async"
                        height={16}
                        loading="lazy"
                        src={db.iconUrl}
                        width={16}
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{db.label}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={selected == null}
          onClick={() => {
            if (selected) {
              actions.onDatabaseConfirm?.(selected.id);
            }
          }}
          type="button"
        >
          Confirm
        </Button>
      </div>
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
