"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

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
        "nodrag nopan canvas-node-connection-button absolute flex size-2 cursor-pointer items-center justify-center rounded-full bg-zinc-50 p-0",
        className
      )}
      data-side={side}
      data-slot="canvas-node-connection-button"
      onPointerDown={(event) => {
        actions.startConnection?.(side, event);
      }}
      size={null}
      tabIndex={-1}
      type="button"
      variant={null}
    />
  );
}
