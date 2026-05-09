"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutGrid, Plus, Search } from "lucide-react";
import type { ComponentProps } from "react";

import { useProjectExplorer } from "./project-explorer.context";

/** Title row: grid icon + “Projects” label. */
export function ProjectExplorerHeaderBrand({
  className,
  label = "Projects",
  ...props
}: ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-slot="project-explorer-header-brand"
      {...props}
    >
      <LayoutGrid
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
      <div className="text-start font-mono text-base text-foreground leading-none">
        {label}
      </div>
    </div>
  );
}

/** Second-row wrapper: search + actions (`min-w-0` flex row). */
export function ProjectExplorerHeaderToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-slot="project-explorer-header-toolbar"
      {...props}
    />
  );
}

/** Search field wired to explorer context (`searchQuery` / `setSearchQuery`). */
export function ProjectExplorerSearchField({
  className,
  placeholder = "Search projects…",
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  placeholder?: string;
}) {
  const { searchQuery, setSearchQuery } = useProjectExplorer();

  return (
    <div
      className={cn("relative min-w-0 flex-1", className)}
      data-slot="project-explorer-search-field"
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search projects"
        className="h-8 pl-9 shadow-xs"
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={searchQuery}
        {...props}
      />
    </div>
  );
}

/** Primary “New project” control; calls `actions.onNewProject` when set. */
export function ProjectExplorerNewProjectButton({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  const { actions } = useProjectExplorer();
  const { onClick, ...rest } = props;

  return (
    <Button
      className={className}
      size="lg"
      type="button"
      variant="default"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          actions.onNewProject?.();
        }
      }}
    >
      {children ?? (
        <>
          <Plus aria-hidden className="size-4" />
          New Project
        </>
      )}
    </Button>
  );
}
