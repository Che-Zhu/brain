"use client";

import { EnvironmentNodeContext } from "./environment-node.context";
import type { EnvironmentNodeProviderProps } from "./environment-node.types";

export function EnvironmentNodeProvider({
  children,
  value,
}: EnvironmentNodeProviderProps) {
  return (
    <EnvironmentNodeContext value={value}>{children}</EnvironmentNodeContext>
  );
}
