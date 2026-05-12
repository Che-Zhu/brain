"use client";

import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DatabaseNodeProvider } from "./database-node.provider";
import type {
  DatabaseNodeConnection,
  DatabaseNodeConnectionKey,
  DatabaseNodeContextValue,
  DatabaseNodeRootProps,
} from "./database-node.types";

const DEFAULT_COPIED_FEEDBACK_MS = 1200;

async function copyTextToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

export function getDatabaseNodeConnectionKey(
  connection: DatabaseNodeConnection,
  index: number
) {
  return connection.id ?? String(index);
}

export function canCopyDatabaseNodeConnection(
  connection: DatabaseNodeConnection
) {
  if (!connection.value) {
    return false;
  }

  if (connection.kind === "public" && !connection.publicAccess.enabled) {
    return false;
  }

  return true;
}

export function DatabaseNodeRoot({
  children,
  connections,
  copiedConnectionKey,
  copiedFeedbackMs = DEFAULT_COPIED_FEEDBACK_MS,
  defaultExpanded,
  expanded,
  interaction,
  lifecycleActions,
  onCopyConnection,
  onExpandedChange,
  onStartConnection,
  onTogglePublicConnection,
  quickActions,
  states,
}: DatabaseNodeRootProps) {
  const [internalCopiedConnectionKey, setInternalCopiedConnectionKey] =
    useState<DatabaseNodeConnectionKey | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedConnectionControlled = copiedConnectionKey !== undefined;

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const showCopiedFeedback = useCallback(
    (connection: DatabaseNodeConnection, index: number) => {
      if (copiedConnectionControlled) {
        return;
      }

      setInternalCopiedConnectionKey(
        getDatabaseNodeConnectionKey(connection, index)
      );

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = setTimeout(() => {
        setInternalCopiedConnectionKey(null);
        resetTimerRef.current = null;
      }, copiedFeedbackMs);
    },
    [copiedConnectionControlled, copiedFeedbackMs]
  );

  const copyConnection = useCallback(
    async (connection: DatabaseNodeConnection, index: number) => {
      if (!(canCopyDatabaseNodeConnection(connection) && connection.value)) {
        return;
      }

      showCopiedFeedback(connection, index);

      if (onCopyConnection) {
        await onCopyConnection(connection, index);
      } else {
        await copyTextToClipboard(connection.value);
      }
    },
    [onCopyConnection, showCopiedFeedback]
  );

  const value = useMemo(
    (): DatabaseNodeContextValue => ({
      actions: {
        copyConnection,
        lifecycleActions,
        quickActions,
        togglePublicConnection: onTogglePublicConnection,
      },
      meta: {
        copiedFeedbackMs,
      },
      state: {
        connections,
        copiedConnectionKey: copiedConnectionControlled
          ? copiedConnectionKey
          : internalCopiedConnectionKey,
        states,
      },
    }),
    [
      connections,
      copiedConnectionControlled,
      copiedConnectionKey,
      copiedFeedbackMs,
      copyConnection,
      internalCopiedConnectionKey,
      lifecycleActions,
      onTogglePublicConnection,
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
      <DatabaseNodeProvider value={value}>{children}</DatabaseNodeProvider>
    </CanvasNodeRoot>
  );
}
