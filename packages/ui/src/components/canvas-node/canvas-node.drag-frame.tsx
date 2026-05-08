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
  if (!dragging) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("canvas-node-drag-frame inline-flex rounded-xl", className)}
      data-dragging="true"
      data-slot="canvas-node-drag-frame"
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
