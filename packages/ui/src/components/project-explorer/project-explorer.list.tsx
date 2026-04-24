"use client";

import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import type { KeyboardEvent } from "react";

import { useProjectExplorer } from "./project-explorer.context";
import type { ProjectExplorerProject } from "./project-explorer.types";
import { formatCreatedAt, toDate } from "./project-explorer.utils";

const DEFAULT_EMPTY_TITLE = "No projects yet";
const DEFAULT_EMPTY_DESCRIPTION = "Create a project to see it here.";

export function ProjectExplorerList({ className }: { className?: string }) {
  const { actions, states } = useProjectExplorer();
  const { projects, empty } = states;
  const interactive = actions.onProjectClick != null;
  const canTogglePublic = actions.onProjectPublicChange != null;

  if (projects.length === 0) {
    const title = empty?.title?.trim() || DEFAULT_EMPTY_TITLE;
    const description =
      empty?.description === undefined
        ? DEFAULT_EMPTY_DESCRIPTION
        : empty.description.trim() || null;

    return (
      <div className={cn(className)} data-slot="project-explorer-list">
        <div
          className="flex flex-col items-center justify-center rounded-xl px-4 py-10 text-center"
          data-slot="project-explorer-empty"
        >
          <p className="font-medium text-foreground text-sm">{title}</p>
          {description ? (
            <p className="mt-1.5 max-w-sm text-balance text-muted-foreground text-xs leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  function handleRowActivate(project: ProjectExplorerProject) {
    actions.onProjectClick?.(project);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    project: ProjectExplorerProject
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleRowActivate(project);
    }
  }

  return (
    <div className={cn(className)} data-slot="project-explorer-list">
      <ul className="flex flex-col">
        {projects.map((project) => {
          const created = toDate(project.createdAt);
          const iso = Number.isNaN(created.getTime())
            ? undefined
            : created.toISOString();
          const isPublic = project.public === true;
          return (
            <li
              className="rounded-xl px-4 py-3"
              data-slot="project-explorer-item"
              key={project.id}
            >
              <div className="hoverable flex min-w-0 items-center gap-3 rounded-xl p-3">
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-row items-baseline justify-between gap-3 text-start",
                    interactive && "cursor-pointer"
                  )}
                  {...(interactive
                    ? {
                        role: "button" as const,
                        tabIndex: 0,
                        onClick: () => handleRowActivate(project),
                        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) =>
                          handleRowKeyDown(e, project),
                      }
                    : {})}
                >
                  <span className="min-w-0 truncate font-medium text-foreground text-sm">
                    {project.name}
                  </span>
                  <time
                    className="shrink-0 text-muted-foreground text-xs tabular-nums"
                    dateTime={iso}
                  >
                    {formatCreatedAt(project.createdAt)}
                  </time>
                </div>
                {canTogglePublic ? (
                  <Switch
                    aria-label={
                      isPublic
                        ? `${project.name} is public`
                        : `${project.name} is private`
                    }
                    checked={isPublic}
                    onCheckedChange={(next) => {
                      const result = actions.onProjectPublicChange?.(
                        project,
                        next
                      );
                      if (
                        result &&
                        typeof (result as Promise<unknown>).then === "function"
                      ) {
                        (result as Promise<unknown>).catch(() => undefined);
                      }
                    }}
                    size="sm"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
