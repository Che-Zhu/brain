"use client";

import { cn } from "@workspace/ui/lib/utils";

import type {
  CanvasNodeStatus as CanvasNodeStatusData,
  CanvasNodeStatusTone,
} from "./canvas-node.types";

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

export function normalizeCanvasNodeStatus(
  input: string | undefined
): CanvasNodeStatusTone {
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

function getStatusVisual(tone: CanvasNodeStatusTone): StatusVisual {
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

function resolveTone(status: CanvasNodeStatusData | undefined) {
  return status?.tone ?? normalizeCanvasNodeStatus(status?.label);
}

export function CanvasNodeStatusDot({
  className,
  size = "default",
  status,
}: {
  className?: string;
  size?: "collapsed" | "default" | "small";
  status?: CanvasNodeStatusData;
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

export function CanvasNodeStatusPill({
  className,
  status,
}: {
  className?: string;
  status?: CanvasNodeStatusData;
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
      <CanvasNodeStatusDot size="small" status={status} />
    </span>
  );
}

export function CanvasNodeStatus({
  className,
  status,
}: {
  className?: string;
  status: CanvasNodeStatusData;
}) {
  return (
    <span className={cn("canvas-node-status min-w-0 shrink-0", className)}>
      <CanvasNodeStatusPill
        className="canvas-node-status-pill max-w-28"
        status={status}
      />
      <CanvasNodeStatusDot
        className="canvas-node-status-dot"
        size="collapsed"
        status={status}
      />
    </span>
  );
}
