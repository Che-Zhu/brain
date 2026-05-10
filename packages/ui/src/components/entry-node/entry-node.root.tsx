"use client";

import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EntryNodeProvider } from "./entry-node.provider";
import type {
  EntryNodeContextValue,
  EntryNodeRootProps,
  EntryNodeTarget,
  EntryNodeTargetKey,
} from "./entry-node.types";

const DEFAULT_COPIED_FEEDBACK_MS = 1200;

async function copyTextToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

export function EntryNodeRoot({
  accessDomain,
  children,
  copiedFeedbackMs = DEFAULT_COPIED_FEEDBACK_MS,
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
  const [internalCopiedTargetKey, setInternalCopiedTargetKey] =
    useState<EntryNodeTargetKey | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTargetControlled = copiedTargetKey !== undefined;

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const copyTarget = useCallback(
    async (target: EntryNodeTarget, index: number) => {
      if (!target.value) {
        return;
      }

      if (onCopyTarget) {
        await onCopyTarget(target, index);
      } else {
        await copyTextToClipboard(target.value);
      }

      if (!copiedTargetControlled) {
        setInternalCopiedTargetKey(target.id ?? String(index));

        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }

        resetTimerRef.current = setTimeout(() => {
          setInternalCopiedTargetKey(null);
          resetTimerRef.current = null;
        }, copiedFeedbackMs);
      }
    },
    [copiedFeedbackMs, copiedTargetControlled, onCopyTarget]
  );

  const value = useMemo(
    (): EntryNodeContextValue => ({
      actions: {
        copyTarget,
        openTargetSettings: onOpenTargetSettings,
      },
      meta: {
        copiedFeedbackMs,
      },
      state: {
        accessDomain,
        copiedTargetKey: copiedTargetControlled
          ? copiedTargetKey
          : internalCopiedTargetKey,
        states,
        targets,
      },
    }),
    [
      copiedFeedbackMs,
      copiedTargetControlled,
      copiedTargetKey,
      copyTarget,
      accessDomain,
      internalCopiedTargetKey,
      onOpenTargetSettings,
      states,
      targets,
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
      <EntryNodeProvider value={value}>{children}</EntryNodeProvider>
    </CanvasNodeRoot>
  );
}
