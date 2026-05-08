"use client";

import { CanvasNodeContext } from "./canvas-node.context";
import type { CanvasNodeProviderProps } from "./canvas-node.types";

export function CanvasNodeProvider({
  children,
  value,
}: CanvasNodeProviderProps) {
  return <CanvasNodeContext value={value}>{children}</CanvasNodeContext>;
}
