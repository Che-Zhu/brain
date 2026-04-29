"use client";

import { cn } from "@workspace/ui/lib/utils";

import { normalizeEntryNodeStatus } from "./entry-node.guards";
import type { EntryNodeStatus, EntryNodeStatusTone } from "./entry-node.types";

interface StatusVisual {
  breathing: boolean;
  dotClassName: string;
  pillClassName: string;
}

const GREEN: StatusVisual = {
  breathing: true,
  dotClassName: "bg-green-500",
  pillClassName: "bg-green-500/30 text-zinc-50",
};
const BLUE: StatusVisual = {
  breathing: true,
  dotClassName: "bg-blue-500",
  pillClassName: "bg-blue-500/30 text-zinc-50",
};
const YELLOW: StatusVisual = {
  breathing: true,
  dotClassName: "bg-yellow-500",
  pillClassName: "bg-yellow-500/30 text-zinc-50",
};
const GRAY_BREATHING: StatusVisual = {
  breathing: true,
  dotClassName: "bg-neutral-500",
  pillClassName: "bg-neutral-500/30 text-zinc-50",
};
const GRAY_STATIC: StatusVisual = {
  breathing: false,
  dotClassName: "bg-neutral-500",
  pillClassName: "bg-neutral-500/30 text-zinc-50",
};
const RED: StatusVisual = {
  breathing: true,
  dotClassName: "bg-red-500",
  pillClassName: "bg-red-500/30 text-zinc-50",
};

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

function resolveTone(status: EntryNodeStatus | undefined) {
  return status?.tone ?? normalizeEntryNodeStatus(status?.label);
}

export function EntryNodeStatusDot({
  className,
  size = "default",
  status,
}: {
  className?: string;
  size?: "collapsed" | "default" | "small";
  status?: EntryNodeStatus;
}) {
  const visual = getStatusVisual(resolveTone(status));
  const dotSize = size === "default" ? "size-3" : "size-2";
  const pingSize = size === "default" ? "size-2.5" : "size-2";

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        size === "default" ? "size-4" : "size-3.5",
        className
      )}
    >
      {visual.breathing ? (
        <span
          className={cn(
            "absolute animate-ping rounded-full opacity-75",
            pingSize,
            visual.dotClassName
          )}
        />
      ) : null}
      <span
        className={cn("relative rounded-full", dotSize, visual.dotClassName)}
      />
    </span>
  );
}

export function EntryNodeStatusPill({
  className,
  status,
}: {
  className?: string;
  status?: EntryNodeStatus;
}) {
  const statusLabel = status?.label?.trim() || "Unknown";
  const visual = getStatusVisual(resolveTone(status));

  return (
    <span
      className={cn(
        "flex h-5 shrink-0 items-center gap-2.5 rounded-full py-0.5 pr-1 pl-2.5 font-normal text-xs leading-none",
        visual.pillClassName,
        className
      )}
    >
      <span className="truncate">{statusLabel}</span>
      <EntryNodeStatusDot size="small" status={status} />
    </span>
  );
}
