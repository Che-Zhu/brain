"use client";

import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import { Ellipsis } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import { resolveEntryNodeTargetVisualStatus } from "./entry-node.status";
import type { EntryNodeTarget } from "./entry-node.types";

function getTargetKey(target: EntryNodeTarget, index: number) {
  return target.id ?? String(index);
}

export function EntryNodeTargetList({ className }: { className?: string }) {
  const {
    state: { targets = [] },
  } = useEntryNode();
  const scrollable = targets.length > 2;

  if (targets.length === 0) {
    return (
      <div
        className={cn(
          "entry-node-target-empty mt-2.5 flex min-w-0 items-center rounded-lg bg-zinc-950/20 px-2.5 text-muted-foreground text-xs leading-4",
          className
        )}
        data-slot="entry-node-target-empty"
      >
        Not configured
      </div>
    );
  }

  return (
    <div
      className={cn(
        "entry-node-target-list mt-2.5 flex min-w-0 flex-col gap-2",
        className
      )}
      data-scrollable={scrollable || undefined}
      data-slot="entry-node-target-list"
    >
      {targets.map((target, index) => (
        <EntryNodeTargetRow
          index={index}
          key={getTargetKey(target, index)}
          target={target}
        />
      ))}
    </div>
  );
}

export function EntryNodeTargetRow({
  className,
  index,
  target,
}: {
  className?: string;
  index: number;
  target: EntryNodeTarget;
}) {
  const { actions } = useEntryNode();
  const rowKey = getTargetKey(target, index);
  const visualStatus = resolveEntryNodeTargetVisualStatus(target.status);

  return (
    <CanvasNode.CopyableRow
      className={cn(
        "entry-node-target-row relative flex min-w-0 items-start gap-2 rounded-lg bg-zinc-950/20 p-2.5 transition-colors",
        className
      )}
      copyAriaLabel={`Copy ${target.label} ${target.value}`}
      copyValue={target.value}
      data-slot="entry-node-target-row"
      onCopy={
        actions.copyTarget
          ? () => actions.copyTarget?.(target, index)
          : undefined
      }
      rowKey={rowKey}
      title={target.value}
    >
      {({ copied }) => (
        <>
          <div
            aria-hidden
            className="entry-node-target-content pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-2"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <CanvasNode.StatusDot size="small" status={visualStatus} />
              <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
                {target.label}
              </span>
            </div>
            <span
              className="flex h-7 w-full min-w-0 items-center justify-between gap-2 py-1.5 text-left font-normal text-xs text-zinc-50 leading-4"
              data-copied={copied ? "true" : undefined}
              data-slot="entry-node-target-value"
              title={target.value}
            >
              <span className="min-w-0 truncate">{target.value}</span>
              <CanvasNode.CopyableRowIndicator />
            </span>
          </div>
          <CanvasNode.CopyableRowControl className="pointer-events-auto relative z-20 flex shrink-0">
            <Button
              aria-label={`Open settings for ${target.label}`}
              className="entry-node-target-settings flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50"
              data-slot="entry-node-target-settings"
              onClick={() => {
                actions.openTargetSettings?.(target, index);
              }}
              size={null}
              title={`Open settings for ${target.label}`}
              type="button"
              variant={null}
            >
              <Ellipsis aria-hidden className="size-4" />
            </Button>
          </CanvasNode.CopyableRowControl>
        </>
      )}
    </CanvasNode.CopyableRow>
  );
}
