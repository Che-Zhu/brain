"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PanelRightOpen } from "lucide-react";

import { useCanvasNode } from "./canvas-node.context";

export function CanvasNodeExpandButton({ className }: { className?: string }) {
  const { actions } = useCanvasNode();

  return (
    <Button
      aria-label="Collapse"
      className={cn(
        "nodrag nopan canvas-node-expand-button flex items-center justify-center rounded-lg border-[0.5px] border-white/10 p-0 shadow-none",
        className
      )}
      data-slot="canvas-node-expand-button"
      onClick={() => {
        actions.collapse();
      }}
      size={null}
      type="button"
      variant={null}
    >
      <PanelRightOpen aria-hidden className="size-4 -rotate-90" />
    </Button>
  );
}
