"use client";

import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";

import { ContainerNodeProvider } from "./container-node.provider";
import type {
  ContainerNodeContextValue,
  ContainerNodeRootProps,
} from "./container-node.types";

export function ContainerNodeRoot({
  children,
  defaultExpanded,
  expanded,
  interaction,
  lifecycleActions,
  onExpandedChange,
  quickActions,
  states,
}: ContainerNodeRootProps) {
  const value: ContainerNodeContextValue = {
    actions: {
      lifecycleActions,
      quickActions,
    },
    state: {
      states,
    },
  };

  return (
    <CanvasNodeRoot
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      interaction={interaction}
      onExpandedChange={onExpandedChange}
    >
      <ContainerNodeProvider value={value}>{children}</ContainerNodeProvider>
    </CanvasNodeRoot>
  );
}
