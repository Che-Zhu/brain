"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Handle, type HandleType, Position, useNodeId } from "@xyflow/react";
import { Plus } from "lucide-react";
import type { MouseEvent } from "react";

import type { CanvasNodeConnectionSide } from "./canvas-node.types";

const CONNECTION_SIDE_CONFIG = [
  { position: Position.Top, side: "top" },
  { position: Position.Right, side: "right" },
  { position: Position.Bottom, side: "bottom" },
  { position: Position.Left, side: "left" },
] as const satisfies readonly {
  position: Position;
  side: CanvasNodeConnectionSide;
}[];

export interface CanvasNodeConnectionAnchorProps {
  className?: string;
  type?: HandleType;
}

/**
 * Visual per-side connection affordance for CanvasNode.
 *
 * Canvas owns graph behavior (connection mode, draft edge creation, persistence);
 * this component only owns handle placement and hover feedback inside a node shell.
 */
export function CanvasNodeConnectionAnchor({
  className,
  type = "source",
}: CanvasNodeConnectionAnchorProps) {
  const hasNodeContext = useNodeId() != null;

  return (
    <div
      className={cn(
        "canvas-node-connection-anchor pointer-events-none absolute",
        className
      )}
      data-slot="canvas-node-connection-anchor"
    >
      {CONNECTION_SIDE_CONFIG.map(({ position, side }) => (
        <CanvasNodeConnectionSideAnchor
          hasNodeContext={hasNodeContext}
          key={side}
          position={position}
          side={side}
          type={type}
        />
      ))}
    </div>
  );
}

function setFrameHoverSide(
  target: HTMLElement,
  side: CanvasNodeConnectionSide | null
) {
  const frame = target.closest('[data-slot="canvas-node-frame"]');
  if (!(frame instanceof HTMLElement)) {
    return;
  }
  if (side) {
    frame.dataset.hoverSide = side;
  } else {
    delete frame.dataset.hoverSide;
  }
}

function CanvasNodeConnectionSideAnchor({
  hasNodeContext,
  position,
  side,
  type,
}: {
  hasNodeContext: boolean;
  position: Position;
  side: CanvasNodeConnectionSide;
  type: HandleType;
}) {
  return (
    <>
      <CanvasNodeConnectionTarget
        hasNodeContext={hasNodeContext}
        position={position}
        side={side}
        type={type}
      />
      <CanvasNodeConnectionAffordance side={side} />
    </>
  );
}

function CanvasNodeConnectionTarget({
  hasNodeContext,
  position,
  side,
  type,
}: {
  hasNodeContext: boolean;
  position: Position;
  side: CanvasNodeConnectionSide;
  type: HandleType;
}) {
  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setFrameHoverSide(event.currentTarget, side);
  };
  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    setFrameHoverSide(event.currentTarget, null);
  };
  const targetProps = {
    className:
      "nodrag nopan canvas-node-rf-handle absolute cursor-pointer rounded-full p-0",
    "data-side": side,
    "data-slot": "canvas-node-rf-handle",
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  if (hasNodeContext) {
    return (
      <Handle
        aria-label={`Connect at ${side}`}
        id={side}
        position={position}
        type={type}
        {...targetProps}
      />
    );
  }

  return <span aria-hidden {...targetProps} />;
}

function CanvasNodeConnectionAffordance({
  side,
}: {
  side: CanvasNodeConnectionSide;
}) {
  return (
    <span
      aria-hidden
      className="canvas-node-connection-affordance pointer-events-none absolute flex items-center justify-center rounded-full"
      data-side={side}
      data-slot="canvas-node-connection-affordance"
    >
      <CanvasNodeConnectionIcon />
    </span>
  );
}

function CanvasNodeConnectionIcon() {
  return <Plus aria-hidden className="canvas-node-connection-icon" size={10} />;
}
