"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Handle, type HandleType, Position, useNodeId } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Fragment } from "react";

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
  const nodeId = useNodeId();

  return (
    <div
      className={cn(
        "canvas-node-connection-anchor pointer-events-none absolute",
        className
      )}
      data-slot="canvas-node-connection-anchor"
    >
      {CONNECTION_SIDE_CONFIG.map(({ position, side }) => (
        <Fragment key={side}>
          {nodeId ? (
            <Handle
              aria-label={`Connect at ${side}`}
              className="nodrag nopan canvas-node-rf-handle absolute cursor-pointer rounded-full p-0"
              data-side={side}
              data-slot="canvas-node-rf-handle"
              id={side}
              onMouseEnter={(event) => {
                setFrameHoverSide(event.currentTarget, side);
              }}
              onMouseLeave={(event) => {
                setFrameHoverSide(event.currentTarget, null);
              }}
              position={position}
              type={type}
            />
          ) : (
            <span
              aria-hidden
              className="nodrag nopan canvas-node-rf-handle absolute cursor-pointer rounded-full p-0"
              data-side={side}
              data-slot="canvas-node-rf-handle"
              onMouseEnter={(event) => {
                setFrameHoverSide(event.currentTarget, side);
              }}
              onMouseLeave={(event) => {
                setFrameHoverSide(event.currentTarget, null);
              }}
            />
          )}
          <CanvasNodeConnectionAffordance side={side} />
        </Fragment>
      ))}
    </div>
  );
}

function setFrameHoverSide(
  target: EventTarget,
  side: CanvasNodeConnectionSide | null
) {
  const frame = (target as HTMLElement).closest(
    '[data-slot="canvas-node-frame"]'
  );
  if (!(frame instanceof HTMLElement)) {
    return;
  }
  if (side) {
    frame.dataset.hoverSide = side;
  } else {
    delete frame.dataset.hoverSide;
  }
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
