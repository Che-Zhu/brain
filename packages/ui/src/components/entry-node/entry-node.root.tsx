"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EntryNodeDefaultView } from "./entry-node.default-view";
import { EntryNodeProvider } from "./entry-node.provider";
import type {
  EntryNodeConnectionEvent,
  EntryNodeConnectionSide,
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
  actions,
  children,
  defaultExpanded = false,
  expanded,
  meta,
  onExpandedChange,
  state,
}: EntryNodeRootProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [internalCopiedDomainKey, setInternalCopiedDomainKey] =
    useState<EntryNodeDomainKey | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedControlled = expanded !== undefined;
  const copiedDomainControlled = state.copiedDomainKey !== undefined;
  const resolvedExpanded = expanded ?? internalExpanded;

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const setExpandedState = useCallback(
    (nextExpanded: boolean) => {
      if (!expandedControlled) {
        setInternalExpanded(nextExpanded);
      }
      onExpandedChange?.(nextExpanded);
    },
    [expandedControlled, onExpandedChange]
  );

  const collapse = useCallback(() => {
    actions?.collapse?.();
    setExpandedState(false);
  }, [actions?.collapse, setExpandedState]);

  const expand = useCallback(() => {
    actions?.expand?.();
    setExpandedState(true);
  }, [actions?.expand, setExpandedState]);

  const copyDomain = useCallback(
    async (key: EntryNodeDomainKey, domainValue: string) => {
      if (!domainValue) {
        return;
      }

      if (actions?.copyDomain) {
        await actions.copyDomain(key, domainValue);
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
        }, meta?.copiedFeedbackMs ?? DEFAULT_COPIED_FEEDBACK_MS);
      }
    },
    [actions?.copyDomain, copiedDomainControlled, meta?.copiedFeedbackMs]
  );

  const startConnection = useCallback(
    (side: EntryNodeConnectionSide, event: EntryNodeConnectionEvent) => {
      actions?.startConnection?.(side, event);
    },
    [actions?.startConnection]
  );

  const value = useMemo(
    (): EntryNodeContextValue => ({
      actions: {
        collapse,
        copyDomain,
        expand,
        startConnection,
      },
      meta: {
        ...meta,
        expanded: resolvedExpanded,
      },
      state: {
        ...state,
        copiedDomainKey: copiedDomainControlled
          ? state.copiedDomainKey
          : internalCopiedDomainKey,
      },
    }),
    [
      collapse,
      copiedDomainControlled,
      copyDomain,
      expand,
      internalCopiedDomainKey,
      meta,
      resolvedExpanded,
      startConnection,
      state,
    ]
  );

  return (
    <EntryNodeProvider value={value}>
      {children ?? <EntryNodeDefaultView />}
    </EntryNodeProvider>
  );
}
