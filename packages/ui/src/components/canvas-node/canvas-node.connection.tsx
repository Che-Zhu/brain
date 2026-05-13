"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Handle, type HandleType, Position, useNodeId } from "@xyflow/react";
import { Plus } from "lucide-react";

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
      {CONNECTION_SIDE_CONFIG.map(({ position, side }) =>
        nodeId ? (
          <Handle
            aria-label={`Connect from ${side}`}
            className="nodrag nopan canvas-node-rf-handle absolute flex cursor-pointer items-center justify-center rounded-full p-0"
            data-side={side}
            data-slot="canvas-node-rf-handle"
            id={side}
            key={side}
            onMouseEnter={(event) => {
              setFrameHoverSide(event.currentTarget, side);
            }}
            onMouseLeave={(event) => {
              setFrameHoverSide(event.currentTarget, null);
            }}
            position={position}
            type={type}
          >
            <CanvasNodeConnectionIcon />
          </Handle>
        ) : (
          <span
            aria-hidden
            className="nodrag nopan canvas-node-rf-handle absolute flex cursor-pointer items-center justify-center rounded-full p-0"
            data-side={side}
            data-slot="canvas-node-rf-handle"
            key={side}
            onMouseEnter={(event) => {
              setFrameHoverSide(event.currentTarget, side);
            }}
            onMouseLeave={(event) => {
              setFrameHoverSide(event.currentTarget, null);
            }}
          >
            <CanvasNodeConnectionIcon />
          </span>
        )
      )}
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

function CanvasNodeConnectionIcon() {
  return (
    <Plus
      aria-hidden
      className="canvas-node-connection-icon pointer-events-none"
      size={10}
    />
  );
}
