"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Plus } from "lucide-react";

import { useCanvasNode } from "./canvas-node.context";
import type { CanvasNodeConnectionSide } from "./canvas-node.types";

const CONNECTION_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
] as const satisfies readonly CanvasNodeConnectionSide[];

export function CanvasNodeConnectionLayer() {
  return (
    <div
      className="canvas-node-connection-layer pointer-events-none absolute"
      data-slot="canvas-node-connection-layer"
    >
      {CONNECTION_SIDES.map((side) => (
        <CanvasNodeConnectionButton key={side} side={side} />
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

export function CanvasNodeConnectionButton({
  className,
  side,
}: {
  className?: string;
  side: CanvasNodeConnectionSide;
}) {
  const { actions } = useCanvasNode();

  return (
    <Button
      aria-label={`Connect from ${side}`}
      className={cn(
        "nodrag nopan canvas-node-connection-button absolute flex cursor-pointer items-center justify-center rounded-full p-0",
        className
      )}
      data-side={side}
      data-slot="canvas-node-connection-button"
      onPointerDown={(event) => {
        actions.startConnection?.(side, event);
      }}
      onPointerEnter={(event) => {
        setFrameHoverSide(event.currentTarget, side);
      }}
      onPointerLeave={(event) => {
        setFrameHoverSide(event.currentTarget, null);
      }}
      size={null}
      tabIndex={-1}
      type="button"
      variant={null}
    >
      <Plus
        aria-hidden
        className="canvas-node-connection-icon pointer-events-none"
        size={10}
      />
    </Button>
  );
}
