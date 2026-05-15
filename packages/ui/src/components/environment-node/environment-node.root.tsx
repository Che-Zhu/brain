"use client";

import {
  CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
  type CanvasNodeCopyableRowKey,
  CanvasNodeCopyFeedbackScope,
} from "@workspace/ui/components/canvas-node/canvas-node.copyable-row";
import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";

import { EnvironmentNodeProvider } from "./environment-node.provider";
import type {
  EnvironmentNodeContextValue,
  EnvironmentNodeRootProps,
} from "./environment-node.types";

export const ENVIRONMENT_NODE_LAUNCH_COMMAND_COPY_KEY =
  "launch-command" satisfies CanvasNodeCopyableRowKey;

export function canCopyEnvironmentLaunchCommand(
  launchCommand: string | undefined
) {
  return Boolean(launchCommand?.trim());
}

export function EnvironmentNodeRoot({
  children,
  copiedFeedbackMs = CANVAS_NODE_DEFAULT_COPIED_FEEDBACK_MS,
  copiedLaunchCommand,
  defaultExpanded,
  expanded,
  interaction,
  launchCommand,
  lifecycleActions,
  onCopyLaunchCommand,
  onExpandedChange,
  quickActions,
  states,
}: EnvironmentNodeRootProps) {
  let copiedKey: CanvasNodeCopyableRowKey | null | undefined;

  if (copiedLaunchCommand === undefined) {
    copiedKey = undefined;
  } else {
    copiedKey = copiedLaunchCommand
      ? ENVIRONMENT_NODE_LAUNCH_COMMAND_COPY_KEY
      : null;
  }

  return (
    <CanvasNodeRoot
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      interaction={interaction}
      onExpandedChange={onExpandedChange}
    >
      <CanvasNodeCopyFeedbackScope
        copiedFeedbackMs={copiedFeedbackMs}
        copiedKey={copiedKey}
      >
        {({ copiedKey: resolvedCopiedKey }) => {
          const value: EnvironmentNodeContextValue = {
            actions: {
              copyLaunchCommand: onCopyLaunchCommand,
              lifecycleActions,
              quickActions,
            },
            meta: {
              copiedFeedbackMs,
            },
            state: {
              copiedLaunchCommand:
                resolvedCopiedKey === ENVIRONMENT_NODE_LAUNCH_COMMAND_COPY_KEY,
              launchCommand,
              states,
            },
          };

          return (
            <EnvironmentNodeProvider value={value}>
              {children}
            </EnvironmentNodeProvider>
          );
        }}
      </CanvasNodeCopyFeedbackScope>
    </CanvasNodeRoot>
  );
}
