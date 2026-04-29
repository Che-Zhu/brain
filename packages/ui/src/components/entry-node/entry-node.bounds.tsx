"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useEntryNode } from "./entry-node.context";

const HOVER_INTENT_GRACE_MS = 220;

function isInsideCard(currentTarget: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Node)) {
    return false;
  }

  const cardEl = currentTarget.querySelector('[data-slot="entry-node-card"]');
  return cardEl?.contains(target) ?? false;
}

function stopOutsideCard<E extends MouseEvent | PointerEvent>(event: E) {
  if (!isInsideCard(event.currentTarget as HTMLElement, event.target)) {
    event.stopPropagation();
  }
}

export function EntryNodeBounds({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const {
    meta: { expanded = false },
    state: { interaction },
  } = useEntryNode();
  const selected = interaction?.selected ?? false;
  const [hoverIntent, setHoverIntent] = useState(false);
  const hoverIntentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearHoverIntentTimer = useCallback(() => {
    if (!hoverIntentTimerRef.current) {
      return;
    }

    clearTimeout(hoverIntentTimerRef.current);
    hoverIntentTimerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearHoverIntentTimer();
    },
    [clearHoverIntentTimer]
  );

  const showHoverIntent = useCallback(() => {
    clearHoverIntentTimer();
    setHoverIntent(true);
  }, [clearHoverIntentTimer]);

  const hideHoverIntent = useCallback(() => {
    clearHoverIntentTimer();

    hoverIntentTimerRef.current = setTimeout(() => {
      setHoverIntent(false);
      hoverIntentTimerRef.current = null;
    }, HOVER_INTENT_GRACE_MS);
  }, [clearHoverIntentTimer]);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: scoping selection to the card body; bounds gutter must not forward clicks to the canvas node selection.
    // biome-ignore lint/a11y/noStaticElementInteractions: bounds is a scoping wrapper, not an interactive element; handlers only block propagation outside the card.
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard navigation will be added later; mouse handlers here only stop propagation, no actions.
    <div
      className={cn(
        "entry-node-bounds relative grid place-items-center",
        className
      )}
      data-hover-intent={hoverIntent || undefined}
      data-selected={selected || undefined}
      data-slot="entry-node-bounds"
      data-state={expanded ? "expanded" : "collapsed"}
      onClick={stopOutsideCard}
      onPointerDown={stopOutsideCard}
      onPointerEnter={showHoverIntent}
      onPointerLeave={hideHoverIntent}
    >
      {children}
    </div>
  );
}
