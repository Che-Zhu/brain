"use client";

import {
  CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
  CanvasNodeCopyFeedbackScope,
} from "@workspace/ui/components/canvas-node/canvas-node.copyable-row";
import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";

import { EntryNodeProvider } from "./entry-node.provider";
import type {
  EntryNodeContextValue,
  EntryNodeRootProps,
  EntryNodeTargetKey,
} from "./entry-node.types";

export function EntryNodeRoot({
  accessDomain,
  children,
  copiedFeedbackMs = CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
  copiedTargetKey,
  defaultExpanded,
  expanded,
  interaction,
  onCopyTarget,
  onExpandedChange,
  onOpenTargetSettings,
  onStartConnection,
  states,
  targets,
}: EntryNodeRootProps) {
  return (
    <CanvasNodeRoot
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      interaction={interaction}
      onExpandedChange={onExpandedChange}
      onStartConnection={onStartConnection}
    >
      <CanvasNodeCopyFeedbackScope
        copiedFeedbackMs={copiedFeedbackMs}
        copiedKey={copiedTargetKey}
      >
        {({ copiedKey }) => {
          const value: EntryNodeContextValue = {
            actions: {
              copyTarget: onCopyTarget,
              openTargetSettings: onOpenTargetSettings,
            },
            meta: {
              copiedFeedbackMs,
            },
            state: {
              accessDomain,
              copiedTargetKey: copiedKey as EntryNodeTargetKey | null,
              states,
              targets,
            },
          };

          return (
            <EntryNodeProvider value={value}>{children}</EntryNodeProvider>
          );
        }}
      </CanvasNodeCopyFeedbackScope>
    </CanvasNodeRoot>
  );
}
