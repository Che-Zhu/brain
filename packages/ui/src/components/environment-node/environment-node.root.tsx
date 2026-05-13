"use client";

import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EnvironmentNodeProvider } from "./environment-node.provider";
import type {
  EnvironmentNodeContextValue,
  EnvironmentNodeRootProps,
} from "./environment-node.types";

const DEFAULT_COPIED_FEEDBACK_MS = 1200;

async function copyTextToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

export function canCopyEnvironmentLaunchCommand(
  launchCommand: string | undefined
) {
  return Boolean(launchCommand?.trim());
}

export function EnvironmentNodeRoot({
  children,
  copiedFeedbackMs = DEFAULT_COPIED_FEEDBACK_MS,
  copiedLaunchCommand,
  defaultExpanded,
  expanded,
  interaction,
  launchCommand,
  lifecycleActions,
  onCopyLaunchCommand,
  onExpandedChange,
  onStartConnection,
  quickActions,
  states,
}: EnvironmentNodeRootProps) {
  const [internalCopiedLaunchCommand, setInternalCopiedLaunchCommand] =
    useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedLaunchCommandControlled = copiedLaunchCommand !== undefined;

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const showCopiedFeedback = useCallback(() => {
    if (copiedLaunchCommandControlled) {
      return;
    }

    setInternalCopiedLaunchCommand(true);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setInternalCopiedLaunchCommand(false);
      resetTimerRef.current = null;
    }, copiedFeedbackMs);
  }, [copiedFeedbackMs, copiedLaunchCommandControlled]);

  const copyLaunchCommand = useCallback(
    async (command: string) => {
      if (!canCopyEnvironmentLaunchCommand(command)) {
        return;
      }

      showCopiedFeedback();

      if (onCopyLaunchCommand) {
        await onCopyLaunchCommand(command);
      } else {
        await copyTextToClipboard(command);
      }
    },
    [onCopyLaunchCommand, showCopiedFeedback]
  );

  const value = useMemo(
    (): EnvironmentNodeContextValue => ({
      actions: {
        copyLaunchCommand,
        lifecycleActions,
        quickActions,
      },
      meta: {
        copiedFeedbackMs,
      },
      state: {
        copiedLaunchCommand: copiedLaunchCommandControlled
          ? copiedLaunchCommand
          : internalCopiedLaunchCommand,
        launchCommand,
        states,
      },
    }),
    [
      copiedFeedbackMs,
      copiedLaunchCommand,
      copiedLaunchCommandControlled,
      copyLaunchCommand,
      internalCopiedLaunchCommand,
      launchCommand,
      lifecycleActions,
      quickActions,
      states,
    ]
  );

  return (
    <CanvasNodeRoot
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      interaction={interaction}
      onExpandedChange={onExpandedChange}
      onStartConnection={onStartConnection}
    >
      <EnvironmentNodeProvider value={value}>
        {children}
      </EnvironmentNodeProvider>
    </CanvasNodeRoot>
  );
}
