"use client";

import type { ReactNode } from "react";

import { CanvasNodeConnectionAnchor } from "./canvas-node.connection";
import { CanvasNodeDragStateFrame } from "./canvas-node.drag-frame";
import { CanvasNodeExpandButton } from "./canvas-node.expand-button";
import { CanvasNodeFrame } from "./canvas-node.frame";
import { CanvasNodeSurface } from "./canvas-node.surface";

export interface CanvasNodeCardProps {
  children?: ReactNode;
  className?: string;
  surfaceClassName?: string;
}

export function CanvasNodeCard({
  children,
  className,
  surfaceClassName,
}: CanvasNodeCardProps) {
  return (
    <CanvasNodeFrame className={className}>
      <CanvasNodeConnectionAnchor />
      <CanvasNodeDragStateFrame>
        <CanvasNodeSurface className={surfaceClassName}>
          {children}
        </CanvasNodeSurface>
      </CanvasNodeDragStateFrame>
      <CanvasNodeExpandButton />
    </CanvasNodeFrame>
  );
}
