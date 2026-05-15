"use client";

import { DatabaseNodeContext } from "./database-node.context";
import type { DatabaseNodeProviderProps } from "./database-node.types";

export function DatabaseNodeProvider({
  children,
  value,
}: DatabaseNodeProviderProps) {
  return <DatabaseNodeContext value={value}>{children}</DatabaseNodeContext>;
}
