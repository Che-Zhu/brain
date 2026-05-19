"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { useCanvasNode } from "./canvas-node.context";

function isFrameHoverWarm(target: HTMLElement) {
  const frame = target.closest('[data-slot="canvas-node-frame"]');
  return frame instanceof HTMLElement && frame.dataset.hoverIntent === "true";
}

export function CanvasNodeExpandButton({ className }: { className?: string }) {
  const { actions, meta } = useCanvasNode();
  const Icon = meta.expanded ? PanelRightOpen : PanelRightClose;

  return (
    <Button
      aria-label={meta.expanded ? "Collapse" : "Expand"}
      className={cn(
        "nodrag nopan canvas-node-expand-button flex items-center justify-center rounded-lg border-[0.5px] border-white/10 p-0 shadow-none active:translate-y-0!",
        className
      )}
      data-slot="canvas-node-expand-button"
      onClick={(event) => {
        event.stopPropagation();

        if (meta.expanded) {
          actions.collapse();
          return;
        }

        actions.expand();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onPointerEnter={(event) => {
        if (
          event.pointerType !== "mouse" ||
          meta.expanded ||
          !isFrameHoverWarm(event.currentTarget)
        ) {
          return;
        }

        actions.expand();
      }}
      size={null}
      type="button"
      variant={null}
    >
      <Icon aria-hidden className="size-4 -rotate-90" />
    </Button>
  );
}
