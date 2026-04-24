"use client";

import type { ComponentProps } from "react";

import {
  ProjectExplorerHeader,
  ProjectExplorerShell,
} from "./project-explorer.layout";
import { ProjectExplorerList } from "./project-explorer.list";

export function ProjectExplorerVariant0({
  className,
}: ComponentProps<typeof ProjectExplorerShell>) {
  return (
    <ProjectExplorerShell className={className}>
      <ProjectExplorerHeader />
      <ProjectExplorerList />
    </ProjectExplorerShell>
  );
}
