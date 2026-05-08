"use client";

import { CanvasNodeRoot } from "@workspace/ui/components/canvas-node/canvas-node.root";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EntryNodeProvider } from "./entry-node.provider";
import type {
  EntryNodeContextValue,
  EntryNodeDomainKey,
  EntryNodeRootProps,
} from "./entry-node.types";

const DEFAULT_COPIED_FEEDBACK_MS = 1200;

async function copyTextToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

export function EntryNodeRoot({
  children,
  copiedDomainKey,
  copiedFeedbackMs = DEFAULT_COPIED_FEEDBACK_MS,
  defaultExpanded,
  domains,
  expanded,
  interaction,
  onCopyDomain,
  onExpandedChange,
  onStartConnection,
  states,
}: EntryNodeRootProps) {
  const [internalCopiedDomainKey, setInternalCopiedDomainKey] =
    useState<EntryNodeDomainKey | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedDomainControlled = copiedDomainKey !== undefined;

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const copyDomain = useCallback(
    async (key: EntryNodeDomainKey, domainValue: string) => {
      if (!domainValue) {
        return;
      }

      if (onCopyDomain) {
        await onCopyDomain(key, domainValue);
      } else {
        await copyTextToClipboard(domainValue);
      }

      if (!copiedDomainControlled) {
        setInternalCopiedDomainKey(key);

        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }

        resetTimerRef.current = setTimeout(() => {
          setInternalCopiedDomainKey(null);
          resetTimerRef.current = null;
        }, copiedFeedbackMs);
      }
    },
    [copiedDomainControlled, copiedFeedbackMs, onCopyDomain]
  );

  const value = useMemo(
    (): EntryNodeContextValue => ({
      actions: {
        copyDomain,
      },
      meta: {
        copiedFeedbackMs,
      },
      state: {
        copiedDomainKey: copiedDomainControlled
          ? copiedDomainKey
          : internalCopiedDomainKey,
        domains,
        states,
      },
    }),
    [
      copiedDomainControlled,
      copiedDomainKey,
      copiedFeedbackMs,
      copyDomain,
      domains,
      internalCopiedDomainKey,
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
      <EntryNodeProvider value={value}>{children}</EntryNodeProvider>
    </CanvasNodeRoot>
  );
}
