"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";

import { useCanvasNode } from "./canvas-node.context";

export function CanvasNodeSurface({
  children,
  className,
  onDoubleClick,
  ...props
}: ComponentProps<"article">) {
  const { actions, meta } = useCanvasNode();

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: double-click toggle is a pointer affordance paired with the explicit expand button.
    <article
      className={cn(
        "canvas-node-surface canvas-node-hover-surface flex min-w-0 flex-col overflow-hidden rounded-lg border-[0.5px] border-white/10 text-zinc-50 backdrop-blur-2xl",
        className
      )}
      data-slot="canvas-node-surface"
      onDoubleClick={(event) => {
        onDoubleClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (meta.expanded) {
          actions.collapse();
          return;
        }

        actions.expand();
      }}
      {...props}
    >
      {children}
    </article>
  );
}
