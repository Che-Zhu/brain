"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Plus } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import type { EntryNodeConnectionSide } from "./entry-node.types";

export function EntryNodeConnectionButton({
  className,
  side,
}: {
  className?: string;
  side: EntryNodeConnectionSide;
}) {
  const { actions } = useEntryNode();

  return (
    <Button
      aria-label={`Connect from ${side}`}
      className={cn(
        "nodrag nopan cursor-pointer entry-node-connection-button absolute flex size-5 items-center justify-center rounded-full border border-blue-500 p-0 text-blue-500 shadow-none hover:text-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/60",
        className
      )}
      data-side={side}
      data-slot="entry-node-connection-button"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          actions.startConnection?.(side, event);
        }
      }}
      onPointerDown={(event) => {
        actions.startConnection?.(side, event);
      }}
      size={null}
      type="button"
      variant={null}
    >
      <Plus aria-hidden className="size-2.5 text-white" />
    </Button>
  );
}
