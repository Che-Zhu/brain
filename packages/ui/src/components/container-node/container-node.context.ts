"use client";

import { createContext, use } from "react";

import type { ContainerNodeContextValue } from "./container-node.types";

export const ContainerNodeContext =
  createContext<ContainerNodeContextValue | null>(null);

export function useContainerNode(): ContainerNodeContextValue {
  const value = use(ContainerNodeContext);

  if (!value) {
    throw new Error(
      "ContainerNode: compound components must be used within ContainerNode.Root"
    );
  }

  return value;
}
