"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCanvasNode } from "./canvas-node.context";

const HOVER_INTENT_GRACE_MS = 220;
const HOVER_EXPAND_DWELL_MS = 550;

function isInsideSurface(
  currentTarget: HTMLElement,
  target: EventTarget | null
) {
  if (!(target instanceof Node)) {
    return false;
  }

  const surfaceEl = currentTarget.querySelector(
    '[data-slot="canvas-node-surface"]'
  );
  return surfaceEl?.contains(target) ?? false;
}

function stopOutsideSurface<E extends MouseEvent | PointerEvent>(event: E) {
  if (!isInsideSurface(event.currentTarget as HTMLElement, event.target)) {
    event.stopPropagation();
  }
}

export function CanvasNodeFrame({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const {
    actions,
    meta: { expanded },
    state: { interaction },
  } = useCanvasNode();
  const selected = interaction?.selected ?? false;
  const dragging = interaction?.dragging ?? false;
  const [hoverIntent, setHoverIntent] = useState(false);
  const pointerInsideFrameRef = useRef(false);
  const hoverIntentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearHoverIntentTimer = useCallback(() => {
    if (!hoverIntentTimerRef.current) {
      return;
    }

    clearTimeout(hoverIntentTimerRef.current);
    hoverIntentTimerRef.current = null;
  }, []);

  const clearHoverExpandTimer = useCallback(() => {
    if (!hoverExpandTimerRef.current) {
      return;
    }

    clearTimeout(hoverExpandTimerRef.current);
    hoverExpandTimerRef.current = null;
  }, []);

  const startHoverIntent = useCallback(() => {
    clearHoverIntentTimer();
    setHoverIntent(true);

    clearHoverExpandTimer();

    if (expanded) {
      return;
    }

    hoverExpandTimerRef.current = setTimeout(() => {
      actions.expand();
      hoverExpandTimerRef.current = null;
    }, HOVER_EXPAND_DWELL_MS);
  }, [actions, clearHoverExpandTimer, clearHoverIntentTimer, expanded]);

  useEffect(
    () => () => {
      clearHoverIntentTimer();
      clearHoverExpandTimer();
    },
    [clearHoverExpandTimer, clearHoverIntentTimer]
  );

  useEffect(() => {
    if (dragging) {
      clearHoverIntentTimer();
      clearHoverExpandTimer();
      setHoverIntent(false);
      return;
    }

    if (pointerInsideFrameRef.current) {
      startHoverIntent();
    }
  }, [
    clearHoverExpandTimer,
    clearHoverIntentTimer,
    dragging,
    startHoverIntent,
  ]);

  const showHoverIntent = useCallback(() => {
    pointerInsideFrameRef.current = true;

    if (dragging) {
      clearHoverIntentTimer();
      clearHoverExpandTimer();
      setHoverIntent(false);
      return;
    }

    startHoverIntent();
  }, [
    clearHoverExpandTimer,
    clearHoverIntentTimer,
    dragging,
    startHoverIntent,
  ]);

  const hideHoverIntent = useCallback(() => {
    pointerInsideFrameRef.current = false;
    clearHoverIntentTimer();
    clearHoverExpandTimer();

    hoverIntentTimerRef.current = setTimeout(() => {
      setHoverIntent(false);
      hoverIntentTimerRef.current = null;
    }, HOVER_INTENT_GRACE_MS);
  }, [clearHoverExpandTimer, clearHoverIntentTimer]);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: frame scopes canvas hit targets and hover dwell; interaction stays on child controls.
    // biome-ignore lint/a11y/noStaticElementInteractions: frame is a visual/state wrapper, not an interactive control.
    // biome-ignore lint/a11y/useKeyWithClickEvents: mouse handlers only stop propagation outside the surface.
    <div
      className={cn(
        "canvas-node-frame relative grid place-items-center",
        className
      )}
      data-hover-intent={hoverIntent || undefined}
      data-selected={selected || undefined}
      data-slot="canvas-node-frame"
      data-state={expanded ? "expanded" : "collapsed"}
      onClick={stopOutsideSurface}
      onPointerDown={stopOutsideSurface}
      onPointerEnter={showHoverIntent}
      onPointerLeave={hideHoverIntent}
    >
      {children}
    </div>
  );
}
