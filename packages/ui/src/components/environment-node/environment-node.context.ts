"use client";

import { createContext, use } from "react";

import type { EnvironmentNodeContextValue } from "./environment-node.types";

export const EnvironmentNodeContext =
  createContext<EnvironmentNodeContextValue | null>(null);

export function useEnvironmentNode(): EnvironmentNodeContextValue {
  const value = use(EnvironmentNodeContext);

  if (!value) {
    throw new Error(
      "EnvironmentNode: compound components must be used within EnvironmentNode.Root"
    );
  }

  return value;
}
