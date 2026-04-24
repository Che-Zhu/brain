"use client";

import "@xyflow/react/dist/style.css";
import "./project-flow.css";

import {
  ProjectFlowContext,
  ProjectFlowRoot,
  useProjectFlow as useProjectFlowBound,
} from "./project-flow.context";
import { ProjectFlowContainerNode } from "./project-flow.nodes";
import { ProjectFlowShell } from "./project-flow.shell";
import { ProjectFlowVariant0 } from "./project-flow.variant0";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useProjectFlow }`
export { useProjectFlow } from "./project-flow.context";
export type {
  ProjectFlowActions,
  ProjectFlowStates,
  ProjectFlowValue,
} from "./project-flow.types";

export const ProjectFlow = Object.assign(ProjectFlowShell, {
  ContainerNode: ProjectFlowContainerNode,
  Context: ProjectFlowContext,
  Root: ProjectFlowRoot,
  Shell: ProjectFlowShell,
  Variant0: ProjectFlowVariant0,
  useProjectFlow: useProjectFlowBound,
});

const dn = (c: object, name: string) => {
  (c as { displayName?: string }).displayName = name;
};
dn(ProjectFlowRoot, "ProjectFlow.Root");
dn(ProjectFlowVariant0, "ProjectFlow.Variant0");
dn(ProjectFlowShell, "ProjectFlow.Shell");
