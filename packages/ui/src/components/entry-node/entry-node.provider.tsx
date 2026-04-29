"use client";

import { EntryNodeContext } from "./entry-node.context";
import type { EntryNodeProviderProps } from "./entry-node.types";

export function EntryNodeProvider({ children, value }: EntryNodeProviderProps) {
  return <EntryNodeContext value={value}>{children}</EntryNodeContext>;
}
