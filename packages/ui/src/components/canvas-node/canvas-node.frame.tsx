"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useState } from "react";

import { useCanvasNode } from "./canvas-node.context";

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
    meta: { expanded },
    state: { interaction },
  } = useCanvasNode();
  const selected = interaction?.selected ?? false;
  const dragging = interaction?.dragging ?? false;
  const [hoverIntent, setHoverIntent] = useState(false);

  const showHoverIntent = useCallback(() => {
    if (dragging) {
      setHoverIntent(false);
      return;
    }

    setHoverIntent(true);
  }, [dragging]);

  const hideHoverIntent = useCallback(() => {
    setHoverIntent(false);
  }, []);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: frame scopes canvas hit targets and hover state; interaction stays on child controls.
    // biome-ignore lint/a11y/noStaticElementInteractions: frame is a visual/state wrapper, not an interactive control.
    // biome-ignore lint/a11y/useKeyWithClickEvents: mouse handlers only stop propagation outside the surface.
    <div
      className={cn("canvas-node-frame relative", className)}
      data-dragging={dragging || undefined}
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
