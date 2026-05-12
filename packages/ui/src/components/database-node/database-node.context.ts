"use client";

import { createContext, use } from "react";

import type { DatabaseNodeContextValue } from "./database-node.types";

export const DatabaseNodeContext =
  createContext<DatabaseNodeContextValue | null>(null);

export function useDatabaseNode(): DatabaseNodeContextValue {
  const value = use(DatabaseNodeContext);

  if (!value) {
    throw new Error(
      "DatabaseNode: compound components must be used within DatabaseNode.Root"
    );
  }

  return value;
}
