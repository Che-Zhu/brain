"use client";

import {
  ProjectExplorerContext,
  ProjectExplorerRoot,
  useProjectExplorer as useProjectExplorerBound,
} from "./project-explorer.context";
import {
  ProjectExplorerHeader,
  ProjectExplorerShell,
} from "./project-explorer.layout";
import { ProjectExplorerList } from "./project-explorer.list";
import { ProjectExplorerVariant0 } from "./project-explorer.variant0";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useProjectExplorer }`
export { useProjectExplorer } from "./project-explorer.context";
export type {
  ProjectExplorerActions,
  ProjectExplorerEmptyState,
  ProjectExplorerProject,
  ProjectExplorerStates,
  ProjectExplorerValue,
} from "./project-explorer.types";

export const ProjectExplorer = Object.assign(ProjectExplorerShell, {
  Context: ProjectExplorerContext,
  Header: ProjectExplorerHeader,
  List: ProjectExplorerList,
  Root: ProjectExplorerRoot,
  Shell: ProjectExplorerShell,
  Variant0: ProjectExplorerVariant0,
  useProjectExplorer: useProjectExplorerBound,
});

const dn = (c: object, name: string) => {
  (c as { displayName?: string }).displayName = name;
};
dn(ProjectExplorerRoot, "ProjectExplorer.Root");
dn(ProjectExplorerVariant0, "ProjectExplorer.Variant0");
dn(ProjectExplorerShell, "ProjectExplorer.Shell");
dn(ProjectExplorerHeader, "ProjectExplorer.Header");
dn(ProjectExplorerList, "ProjectExplorer.List");
