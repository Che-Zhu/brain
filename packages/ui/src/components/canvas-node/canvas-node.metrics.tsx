"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

import {
  CanvasNodeStatusDot,
  DEFAULT_CANVAS_NODE_STATUS,
  getCanvasNodeStatusTextClassName,
  resolveCanvasNodeStatus,
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

export function CanvasNodeFooterStatus({
  className,
  status = DEFAULT_CANVAS_NODE_STATUS,
}: {
  className?: string;
  status?: CanvasNodeStatus;
}) {
  const resolvedStatus = resolveCanvasNodeStatus(status);

  return (
    <span
      className={cn(
        "flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-full",
        className
      )}
    >
      <CanvasNodeStatusDot size="small" status={resolvedStatus} />
      <span
        className={cn("truncate", getCanvasNodeStatusTextClassName(status))}
      >
        {resolvedStatus.label}
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
