"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

import {
  CanvasNodeStatusDot,
  normalizeCanvasNodeStatus,
} from "./canvas-node.status";
import type { CanvasNodeStatus } from "./canvas-node.types";

export type CanvasNodeMetricValue = number | string | undefined;

function formatCanvasNodeMetricValue(value: CanvasNodeMetricValue) {
  if (typeof value === "number") {
    return String(value);
  }

  const trimmed = value?.trim();

  return trimmed || "--";
}

function getCanvasNodeStatusTextClassName(status: CanvasNodeStatus) {
  switch (normalizeCanvasNodeStatus(status.tone ?? status.label)) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return "text-green-500";
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return "text-blue-500";
    case "deleting":
    case "degraded":
      return "text-yellow-500";
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return "text-red-500";
    default:
      return "text-neutral-400";
  }
}

const DEFAULT_STATUS = {
  label: "Unknown",
  tone: "unknown",
} as const satisfies CanvasNodeStatus;

export function CanvasNodeFooterStatus({
  className,
  status = DEFAULT_STATUS,
}: {
  className?: string;
  status?: CanvasNodeStatus;
}) {
  const statusLabel = status.label.trim() || DEFAULT_STATUS.label;

  return (
    <span
      className={cn(
        "flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-full",
        className
      )}
    >
      <CanvasNodeStatusDot size="small" status={status} />
      <span
        className={cn("truncate", getCanvasNodeStatusTextClassName(status))}
      >
        {statusLabel}
      </span>
    </span>
  );
}

export function CanvasNodeMetrics({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-end gap-2 text-xs leading-none",
        className
      )}
      data-slot="canvas-node-metrics"
      {...props}
    />
  );
}

export function CanvasNodeMetric({
  children,
  className,
  label,
  value,
}: {
  children?: ReactNode;
  className?: string;
  label: string;
  value: CanvasNodeMetricValue;
}) {
  const formattedValue = formatCanvasNodeMetricValue(value);

  return (
    <span
      className={cn(
        "flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-full text-zinc-50",
        className
      )}
      title={`${label}: ${formattedValue}`}
    >
      {children}
      <span className="truncate tabular-nums">{formattedValue}</span>
    </span>
  );
}
