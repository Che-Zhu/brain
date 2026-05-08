"use client";

import { createContext, use } from "react";

import type { CanvasNodeContextValue } from "./canvas-node.types";

export const CanvasNodeContext = createContext<CanvasNodeContextValue | null>(
  null
);

export function useCanvasNode(): CanvasNodeContextValue {
  const value = use(CanvasNodeContext);

  if (!value) {
    throw new Error(
      "CanvasNode: compound components must be used within CanvasNode.Root"
    );
  }

  return value;
}
