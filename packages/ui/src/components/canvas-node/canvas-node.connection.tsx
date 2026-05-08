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
    <>
      {CONNECTION_SIDES.map((side) => (
        <CanvasNodeConnectionButton key={side} side={side} />
      ))}
    </>
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
        "nodrag nopan canvas-node-connection-button absolute flex size-5 cursor-pointer items-center justify-center rounded-full border border-blue-500 p-0 text-blue-500 shadow-none hover:text-blue-500",
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
    >
      <Plus aria-hidden className="size-2.5 text-white" />
    </Button>
  );
}
