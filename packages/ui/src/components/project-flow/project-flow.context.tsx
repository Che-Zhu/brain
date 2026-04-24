"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type {
  ProjectFlowActions,
  ProjectFlowStates,
  ProjectFlowValue,
} from "./project-flow.types";

export const ProjectFlowContext = createContext<ProjectFlowValue | null>(null);

export function useProjectFlow(): ProjectFlowValue {
  const value = useContext(ProjectFlowContext);
  if (!value) {
    throw new Error(
      "ProjectFlow: useProjectFlow must be used within ProjectFlow.Root"
    );
  }
  return value;
}

export function ProjectFlowRoot({
  actions = {},
  children,
  states,
}: {
  actions?: ProjectFlowActions;
  children?: ReactNode;
  states: ProjectFlowStates;
}) {
  const value = useMemo(
    (): ProjectFlowValue => ({ actions, states }),
    [actions, states]
  );

  return (
    <ProjectFlowContext.Provider value={value}>
      {children}
    </ProjectFlowContext.Provider>
  );
}
