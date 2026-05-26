"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { Database, GitBranch, Package } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { useProjectCreator } from "./project-creator.context";
import type { ProjectCreatorSourceKind } from "./project-creator.types";
import { PROJECT_CREATOR_SOURCE_LABEL } from "./project-creator.types";

const ORDER: ProjectCreatorSourceKind[] = [
  "github",
  "docker-image",
  "database",
];

const DESCRIPTION: Record<ProjectCreatorSourceKind, string> = {
  github: "Import repository from URL or GitHub authorization.",
  "docker-image": "Create and run a project directly using an existing image.",
  database: "Set up a database project or data service first.",
};

const ICON: Record<
  ProjectCreatorSourceKind,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  github: GitBranch,
  "docker-image": Package,
  database: Database,
};

export function ProjectCreatorOptionPicker({
  className,
}: {
  className?: string;
}) {
  const { actions, states } = useProjectCreator("ProjectCreator.OptionPicker");

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-4", className)}
      data-slot="project-creator-option-picker"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="project-creator-display-name">Project Name</Label>
        <Input
          aria-describedby={
            states.projectDisplayNameError
              ? "project-creator-display-name-error"
              : undefined
          }
          aria-invalid={states.projectDisplayNameError ? true : undefined}
          autoComplete="off"
          id="project-creator-display-name"
          onChange={(event) =>
            actions.setProjectDisplayName(event.currentTarget.value)
          }
          placeholder="Enter project name"
          value={states.projectDisplayName}
        />
        {states.projectDisplayNameError ? (
          <p
            className="text-destructive text-xs leading-4"
            id="project-creator-display-name-error"
          >
            {states.projectDisplayNameError}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-medium text-foreground text-sm leading-5">
          Scenario
        </p>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {ORDER.map((id) => {
            const Icon = ICON[id];
            return (
              <button
                className="hoverable flex min-h-[76px] min-w-0 flex-col items-start gap-2 rounded-md border border-transparent p-2.5 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                key={id}
                onClick={() => actions.pick(id)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="truncate font-medium text-primary text-sm leading-5">
                    {PROJECT_CREATOR_SOURCE_LABEL[id]}
                  </span>
                </span>
                <span className="line-clamp-2 text-muted-foreground text-xs leading-4">
                  {DESCRIPTION[id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
