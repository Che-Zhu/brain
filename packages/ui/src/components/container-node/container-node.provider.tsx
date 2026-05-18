"use client";

import { ContainerNodeContext } from "./container-node.context";
import type { ContainerNodeProviderProps } from "./container-node.types";

export function ContainerNodeProvider({
  children,
  value,
}: ContainerNodeProviderProps) {
  return <ContainerNodeContext value={value}>{children}</ContainerNodeContext>;
}
