"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PanelRightOpen } from "lucide-react";

import { useEntryNode } from "./entry-node.context";

export function EntryNodeExpandButton({ className }: { className?: string }) {
  const { actions, meta } = useEntryNode();
  const expanded = meta.expanded ?? false;

  return (
    <Button
      aria-label={expanded ? "Collapse" : "Expand"}
      className={cn(
        "nodrag nopan entry-node-expand-button flex items-center justify-center rounded-lg border-[0.5px] border-white/10 p-0 shadow-none",
        className
      )}
      data-slot="entry-node-expand-button"
      onClick={() => {
        if (expanded) {
          actions.collapse?.();
          return;
        }

        actions.expand?.();
      }}
      size={null}
      type="button"
      variant={null}
    >
      <PanelRightOpen aria-hidden className="size-4 -rotate-90" />
    </Button>
  );
}
