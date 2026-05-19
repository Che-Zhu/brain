"use client";

import {
  CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
  CanvasNodeCopyFeedbackScope,
} from "@workspace/ui/components/canvas-node/canvas-node.copyable-row";
import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";

import { ContainerNodeProvider } from "./container-node.provider";
import type {
  ContainerNodeContextValue,
  ContainerNodeRootProps,
} from "./container-node.types";

export function ContainerNodeRoot({
  children,
  copiedFeedbackMs = CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
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
      <CanvasNodeCopyFeedbackScope copiedFeedbackMs={copiedFeedbackMs}>
        <ContainerNodeProvider value={value}>{children}</ContainerNodeProvider>
      </CanvasNodeCopyFeedbackScope>
    </CanvasNodeRoot>
  );
}
