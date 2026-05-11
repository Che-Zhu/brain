"use client";

import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy, Ellipsis } from "lucide-react";
import type { SyntheticEvent } from "react";

import { useEntryNode } from "./entry-node.context";
import type { EntryNodeTarget } from "./entry-node.types";

function stopNodeControlEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

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
  const {
    actions,
    state: { copiedTargetKey },
  } = useEntryNode();
  const copied = copiedTargetKey === getTargetKey(target, index);
  const copyTarget = () => {
    Promise.resolve(actions.copyTarget(target, index)).catch(() => undefined);
  };

  return (
    <section
      className={cn(
        "group/target entry-node-target-row relative flex min-w-0 items-start gap-2 rounded-lg bg-zinc-950/20 p-2.5 transition-colors",
        className
      )}
      data-slot="entry-node-target-row"
    >
      <button
        aria-label={`Copy ${target.label} ${target.value}`}
        className="nodrag nopan entry-node-target-copy-hitarea absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline-none"
        data-slot="entry-node-target-copy"
        onClick={(event) => {
          event.stopPropagation();
          copyTarget();
        }}
        onDoubleClick={stopNodeControlEvent}
        onKeyDown={stopNodeControlEvent}
        onPointerDown={stopNodeControlEvent}
        title={target.value}
        type="button"
      />
      <div
        aria-hidden
        className="entry-node-target-content pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-2"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <CanvasNode.StatusDot size="small" status={target.status} />
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
          {copied ? (
            <Check aria-hidden className="size-4 shrink-0" />
          ) : (
            <Copy
              aria-hidden
              className="entry-node-target-copy-icon size-4 shrink-0 opacity-0 transition-opacity group-hover/target:opacity-100"
            />
          )}
        </span>
      </div>
      <Button
        aria-label={`Open settings for ${target.label}`}
        className="nodrag nopan entry-node-target-settings pointer-events-auto relative z-20 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50"
        data-slot="entry-node-target-settings"
        onClick={(event) => {
          event.stopPropagation();
          actions.openTargetSettings?.(target, index);
        }}
        onDoubleClick={stopNodeControlEvent}
        onKeyDown={stopNodeControlEvent}
        onPointerDown={stopNodeControlEvent}
        size={null}
        title={`Open settings for ${target.label}`}
        type="button"
        variant={null}
      >
        <Ellipsis aria-hidden className="size-4" />
      </Button>
    </section>
  );
}
