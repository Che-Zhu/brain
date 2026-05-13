"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { useProjectCreator } from "./project-creator.context";
import type { ProjectCreatorSourceKind } from "./project-creator.types";
import { PROJECT_CREATOR_SOURCE_LABEL } from "./project-creator.types";

const ORDER: ProjectCreatorSourceKind[] = [
  "github",
  "docker-image",
  "database",
];

export function ProjectCreatorOptionPicker({
  className,
}: {
  className?: string;
}) {
  const { actions } = useProjectCreator("ProjectCreator.OptionPicker");

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="project-creator-option-picker"
    >
      {ORDER.map((id) => (
        <Button
          className="hoverable h-auto w-full justify-start rounded-xl py-3 text-start"
          key={id}
          onClick={() => actions.pick(id)}
          type="button"
          variant="outline"
        >
          <span className="font-medium text-foreground text-sm">
            {PROJECT_CREATOR_SOURCE_LABEL[id]}
          </span>
        </Button>
      ))}
    </div>
  );
}
