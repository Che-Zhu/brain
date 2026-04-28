"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Brain, PanelRightOpen } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import type { EntryNodeStatusTone } from "./entry-node.types";

interface StatusVisual {
  breathing: boolean;
  haloClassName?: string;
  innerClassName: string;
}

const GREEN: StatusVisual = {
  breathing: true,
  haloClassName: "bg-green-500/30",
  innerClassName: "bg-green-500",
};
const BLUE: StatusVisual = {
  breathing: true,
  haloClassName: "bg-blue-500/30",
  innerClassName: "bg-blue-500",
};
const YELLOW: StatusVisual = {
  breathing: true,
  haloClassName: "bg-yellow-500/30",
  innerClassName: "bg-yellow-500",
};
const GRAY_BREATHING: StatusVisual = {
  breathing: true,
  haloClassName: "bg-neutral-500/30",
  innerClassName: "bg-neutral-500",
};
const GRAY_STATIC: StatusVisual = {
  breathing: false,
  innerClassName: "bg-neutral-500",
};
const RED: StatusVisual = {
  breathing: true,
  haloClassName: "bg-red-500/30",
  innerClassName: "bg-red-500",
};

function normalizeStatus(input: string | undefined): EntryNodeStatusTone {
  const normalized = input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  switch (normalized) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return normalized;
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return normalized;
    case "deleting":
      return normalized;
    case "stopping":
      return normalized;
    case "shutdown":
    case "stopped":
      return normalized;
    case "degraded":
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return normalized;
    default:
      return "unknown";
  }
}

function getStatusVisual(tone: EntryNodeStatusTone): StatusVisual {
  switch (tone) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return GREEN;
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return BLUE;
    case "deleting":
      return YELLOW;
    case "stopping":
      return GRAY_BREATHING;
    case "degraded":
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return RED;
    case "shutdown":
    case "stopped":
    case "unknown":
      return GRAY_STATIC;
    default:
      return GRAY_STATIC;
  }
}

function EntryNodeStatusDot({
  label,
  tone,
}: {
  label?: string;
  tone?: EntryNodeStatusTone;
}) {
  const resolvedTone = tone ?? normalizeStatus(label);
  const visual = getStatusVisual(resolvedTone);

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-3.5 shrink-0 items-center justify-center rounded-full",
        visual.haloClassName
      )}
    >
      {visual.breathing && visual.haloClassName ? (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full",
            visual.haloClassName
          )}
        />
      ) : null}
      <span
        className={cn("relative size-2 rounded-full", visual.innerClassName)}
      />
    </span>
  );
}

function EntryNodeCollapsedBadgeInner({ className }: { className?: string }) {
  const {
    states: { name, status },
  } = useEntryNode();
  const statusLabel = status?.label?.trim() || "Unknown";

  return (
    <div
      aria-label={`${name} status: ${statusLabel}`}
      className={cn(
        "flex h-10 w-40 min-w-0 items-center gap-2 overflow-hidden rounded-lg border-hairline border-white/10 bg-slate-950 p-2.5 text-zinc-50 backdrop-blur-sm transition-colors hover:bg-slate-900",
        className
      )}
      data-slot="entry-node-collapsed-badge"
      role="status"
      title={name}
    >
      <Brain aria-hidden className="size-4 shrink-0 text-zinc-50" />
      <span className="min-w-0 flex-1 truncate font-normal text-sm leading-5">
        {name}
      </span>
      <EntryNodeStatusDot label={statusLabel} tone={status?.tone} />
    </div>
  );
}

export function EntryNodeCollapsedBadge({
  className,
  dragging = false,
}: {
  className?: string;
  dragging?: boolean;
}) {
  if (dragging) {
    return (
      <div
        className="inline-flex rounded-md border border-white p-1"
        data-slot="entry-node-drag-frame"
      >
        <EntryNodeCollapsedBadgeInner className={className} />
      </div>
    );
  }

  return <EntryNodeCollapsedBadgeInner className={className} />;
}

export function EntryNodeExpandButton({ className }: { className?: string }) {
  const { actions } = useEntryNode();

  return (
    <button
      aria-label="Expand entry node"
      className={cn(
        "nodrag inline-flex size-9 shrink-0 items-center justify-center rounded-lg border-hairline border-white/10 bg-slate-950 text-zinc-50 shadow-sm transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={actions.onExpand}
      type="button"
    >
      <PanelRightOpen aria-hidden className="size-4" />
    </button>
  );
}
