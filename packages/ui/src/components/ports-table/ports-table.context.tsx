"use client";

import { createContext, use } from "react";

import type { PortsTableContextValue } from "./ports-table.types";

export const PortsTableContext = createContext<PortsTableContextValue | null>(
  null
);

export function usePortsTableContext(): PortsTableContextValue {
  const ctx = use(PortsTableContext);
  if (!ctx) {
    throw new Error(
      "PortsTable compound components must be used within PortsTable.Root"
    );
  }
  return ctx;
}
