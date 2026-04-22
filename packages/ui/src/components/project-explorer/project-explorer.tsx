"use client";

import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

const ProjectExplorerContext = createContext<ProjectExplorerValue | null>(null);

export interface ProjectExplorerProject {
  createdAt: Date | string;
  id: string;
  /** Display name shown in the list. */
  name: string;
  /** `spec.public` on the Project claim when known. */
  public?: boolean;
}

/** Display state for the explorer (passed into Root as `states`). */
export interface ProjectExplorerStates {
  projects: ProjectExplorerProject[];
}

/** Optional handlers for project rows. */
export interface ProjectExplorerActions {
  onProjectClick?: (project: ProjectExplorerProject) => void;
  /**
   * When set, a public/private switch is shown at the end of each row.
   * Use to PATCH `spec.public` (or your backend); called with the desired next value.
   */
  onProjectPublicChange?: (
    project: ProjectExplorerProject,
    isPublic: boolean
  ) => void | Promise<void>;
}

export interface ProjectExplorerValue {
  actions: ProjectExplorerActions;
  states: ProjectExplorerStates;
}

export function useProjectExplorer(): ProjectExplorerValue {
  const value = useContext(ProjectExplorerContext);
  if (!value) {
    throw new Error(
      "ProjectExplorer: useProjectExplorer must be used within ProjectExplorer.Root"
    );
  }
  return value;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatCreatedAt(value: Date | string): string {
  const d = toDate(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function ProjectExplorerShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden text-sm shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function ProjectExplorerHeader({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <div className={cn("px-4 py-3", className)} {...props}>
      {children ?? (
        <div className="text-start font-mono text-base leading-none">
          Projects
        </div>
      )}
    </div>
  );
}

function ProjectExplorerList({ className }: { className?: string }) {
  const { actions, states } = useProjectExplorer();
  const { projects } = states;
  const interactive = actions.onProjectClick != null;
  const canTogglePublic = actions.onProjectPublicChange != null;

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
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-row items-baseline justify-between gap-3 text-start",
                    interactive &&
                      "hoverable -mx-2 -my-0.5 cursor-pointer rounded-lg px-2 py-0.5"
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
                  <div className="shrink-0">
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
                          typeof (result as Promise<unknown>).then ===
                            "function"
                        ) {
                          (result as Promise<unknown>).catch(() => undefined);
                        }
                      }}
                      size="sm"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProjectExplorerVariant0({
  className,
}: ComponentProps<typeof ProjectExplorerShell>) {
  return (
    <ProjectExplorerShell className={className}>
      <ProjectExplorerHeader />
      <ProjectExplorerList />
    </ProjectExplorerShell>
  );
}

function ProjectExplorerRoot({
  actions = {},
  children,
  states,
}: {
  actions?: ProjectExplorerActions;
  children?: ReactNode;
  states: ProjectExplorerStates;
}) {
  const value = useMemo(
    (): ProjectExplorerValue => ({ actions, states }),
    [actions, states]
  );

  return (
    <ProjectExplorerContext.Provider value={value}>
      {children}
    </ProjectExplorerContext.Provider>
  );
}

export const ProjectExplorer = Object.assign(ProjectExplorerShell, {
  Context: ProjectExplorerContext,
  Header: ProjectExplorerHeader,
  List: ProjectExplorerList,
  Root: ProjectExplorerRoot,
  Shell: ProjectExplorerShell,
  Variant0: ProjectExplorerVariant0,
  useProjectExplorer,
});

ProjectExplorerRoot.displayName = "ProjectExplorer.Root";
ProjectExplorerVariant0.displayName = "ProjectExplorer.Variant0";
ProjectExplorerShell.displayName = "ProjectExplorer.Shell";
ProjectExplorerHeader.displayName = "ProjectExplorer.Header";
ProjectExplorerList.displayName = "ProjectExplorer.List";
