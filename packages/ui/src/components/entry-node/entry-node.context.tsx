"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { EntryNodeStates, EntryNodeValue } from "./entry-node.types";

export const EntryNodeContext = createContext<EntryNodeValue | null>(null);

export function useEntryNode(): EntryNodeValue {
  const value = useContext(EntryNodeContext);
  if (!value) {
    throw new Error(
      "EntryNode: useEntryNode must be used within EntryNode.Root"
    );
  }
  return value;
}

export function EntryNodeRoot({
  children,
  states,
}: {
  children?: ReactNode;
  states: EntryNodeStates;
}) {
  const value = useMemo((): EntryNodeValue => ({ states }), [states]);

  return (
    <EntryNodeContext.Provider value={value}>
      {children}
    </EntryNodeContext.Provider>
  );
}
