"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type {
  ContainerNodeActions,
  ContainerNodeStates,
  ContainerNodeValue,
} from "./container-node.types";

export const ContainerNodeContext = createContext<ContainerNodeValue | null>(
  null
);

export function useContainerNode(): ContainerNodeValue {
  const value = useContext(ContainerNodeContext);
  if (!value) {
    throw new Error(
      "ContainerNode: useContainerNode must be used within ContainerNode.Root"
    );
  }
  return value;
}

export function ContainerNodeRoot({
  actions = {},
  children,
  states,
}: {
  actions?: ContainerNodeActions;
  children?: ReactNode;
  states: ContainerNodeStates;
}) {
  const value = useMemo(
    (): ContainerNodeValue => ({ actions, states }),
    [actions, states]
  );

  return (
    <ContainerNodeContext.Provider value={value}>
      {children}
    </ContainerNodeContext.Provider>
  );
}
