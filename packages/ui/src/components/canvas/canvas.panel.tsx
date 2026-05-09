"use client";

import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { Node } from "@xyflow/react";
import { X } from "lucide-react";

import type { CanvasPanelProps } from "./canvas.types";
import { useCanvasUpperRightContent } from "./canvas.upper-right";
import { useCanvas } from "./canvas.use";

/** Matches container header default subtitle when `kind` is omitted. */
const DEFAULT_KIND_LABEL = "Container";

function panelHeadingFromNode(selected: Node): { kind: string; title: string } {
  if (
    selected.type === "containerNode" &&
    selected.data !== null &&
    typeof selected.data === "object" &&
    "states" in selected.data
  ) {
    const states = (
      selected.data as { states?: { kind?: string; name?: string } }
    ).states;
    if (states?.name != null && states.name !== "") {
      return {
        kind: states.kind ?? DEFAULT_KIND_LABEL,
        title: states.name,
      };
    }
  }
  return {
    kind:
      selected.type != null && selected.type !== ""
        ? selected.type
        : DEFAULT_KIND_LABEL,
    title: selected.id,
  };
}

export function CanvasPanel({ children, className }: CanvasPanelProps) {
  const { actions, meta, state } = useCanvas();
  const upperRight = useCanvasUpperRightContent();

  if (state.selectedNode == null) {
    return null;
  }

  const selected = state.selectedNode;
  const { kind, title } = panelHeadingFromNode(selected);
  const panelKey =
    selected.type != null && selected.type !== "" ? selected.type : null;
  const PanelBody = panelKey == null ? undefined : meta.panelTypes?.[panelKey];

  return (
    <aside
      className={cn(
        "canvas-panel pointer-events-auto absolute top-0 right-0 bottom-0 z-[20] flex w-full min-w-0 flex-col bg-background/95 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <header className="flex shrink-0 flex-row flex-wrap items-center gap-2 border-border/60 border-b p-2">
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
          <div
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-foreground/10"
          >
            <HugeiconsIcon
              aria-hidden
              className="text-muted-foreground"
              icon={ThreeDViewIcon}
              size={24}
              strokeWidth={2}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="min-w-0 max-w-full truncate font-medium text-xs leading-tight">
              {title}
            </div>
            <div className="min-w-0 max-w-full truncate text-[10px] text-muted-foreground">
              {kind}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            aria-label="Close panel"
            className="size-7 shrink-0"
            onClick={() => actions.onPanelClose()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
          {upperRight}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
        {PanelBody == null ? children : <PanelBody node={selected} />}
      </div>
    </aside>
  );
}

CanvasPanel.displayName = "CanvasPanel";
