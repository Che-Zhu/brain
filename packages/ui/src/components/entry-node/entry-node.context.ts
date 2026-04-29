"use client";

import { createContext, use } from "react";

import type { EntryNodeContextValue } from "./entry-node.types";

export const EntryNodeContext = createContext<EntryNodeContextValue | null>(
  null
);

export function useEntryNode(): EntryNodeContextValue {
  const value = use(EntryNodeContext);
  if (!value) {
    throw new Error(
      "EntryNode: compound components must be used within EntryNode.Root or EntryNode.Provider"
    );
  }
  return value;
}
