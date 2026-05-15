"use client";

import { useCallback, useMemo, useState } from "react";

import { CanvasNodeProvider } from "./canvas-node.provider";
import type {
  CanvasNodeContextValue,
  CanvasNodeRootProps,
} from "./canvas-node.types";

export function CanvasNodeRoot({
  children,
  defaultExpanded = false,
  expanded,
  interaction,
  onExpandedChange,
}: CanvasNodeRootProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expandedControlled = expanded !== undefined;
  const resolvedExpanded = expanded ?? internalExpanded;

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
    setExpandedState(false);
  }, [setExpandedState]);

  const expand = useCallback(() => {
    setExpandedState(true);
  }, [setExpandedState]);

  const value = useMemo(
    (): CanvasNodeContextValue => ({
      actions: {
        collapse,
        expand,
      },
      meta: {
        expanded: resolvedExpanded,
      },
      state: {
        interaction,
      },
    }),
    [collapse, expand, interaction, resolvedExpanded]
  );

  return <CanvasNodeProvider value={value}>{children}</CanvasNodeProvider>;
}
