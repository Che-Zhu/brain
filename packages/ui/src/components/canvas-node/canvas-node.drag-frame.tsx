"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

import { useCanvasNode } from "./canvas-node.context";

export function CanvasNodeDragFrame({
  children,
  className,
  dragging = false,
}: {
  children?: ReactNode;
  className?: string;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "canvas-node-card-frame inline-flex rounded-xl",
        dragging && "canvas-node-drag-frame",
        className
      )}
      data-dragging={dragging || undefined}
      data-slot="canvas-node-card-frame"
    >
      {children}
    </div>
  );
}

export function CanvasNodeDragStateFrame({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const {
    state: { interaction },
  } = useCanvasNode();

  return (
    <CanvasNodeDragFrame className={className} dragging={interaction?.dragging}>
      {children}
    </CanvasNodeDragFrame>
  );
}
