"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface CanvasResourcePaneStatus {
  label?: string;
  tone?: string;
  visualTone?: string;
}

export interface CanvasResourcePaneProps {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeAriaLabel?: string;
  icon?: ReactNode;
  onClose: () => void;
  status?: CanvasResourcePaneStatus;
  subtitle?: string;
  title: string;
}

function statusPillClassName(status: CanvasResourcePaneStatus | undefined) {
  const tone = (status?.visualTone ?? status?.tone ?? status?.label ?? "")
    .trim()
    .toLowerCase();

  switch (tone) {
    case "positive":
    case "ready":
    case "running":
      return "bg-database-metrics-status-running text-primary";
    case "negative":
    case "error":
    case "failed":
    case "unhealthy":
      return "bg-destructive/25 text-destructive";
    case "warning":
    case "pending":
    case "progressing":
    case "reconciling":
    case "starting":
    case "stopping":
    case "updating":
      return "bg-theme-yellow/20 text-theme-yellow";
    case "paused":
    case "stopped":
    case "neutral":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}

export function CanvasResourcePane({
  bodyClassName,
  children,
  className,
  closeAriaLabel = "Close resource pane",
  icon,
  onClose,
  status,
  subtitle,
  title,
}: CanvasResourcePaneProps) {
  const statusLabel = status?.label?.trim() ?? "";

  return (
    <aside
      className={cn(
        "database-metrics-pane-surface pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-full min-w-0 max-w-xl flex-col overflow-hidden border-input border-l px-2.5 py-5 shadow-lg",
        className
      )}
    >
      <div
        className={cn(
          "scrollbar-chat-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2.5",
          bodyClassName
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {icon == null ? null : (
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {icon}
                  </span>
                )}
                <h2
                  className="truncate font-semibold text-lg text-primary leading-none"
                  title={title}
                >
                  {title}
                </h2>
              </div>
              {statusLabel === "" ? null : (
                <span
                  className={cn(
                    "inline-flex h-5 shrink-0 items-center rounded-full px-2.5 text-xs leading-none",
                    statusPillClassName(status)
                  )}
                >
                  {statusLabel}
                </span>
              )}
            </div>
            {subtitle == null || subtitle.trim() === "" ? null : (
              <p className="truncate text-muted-foreground text-sm leading-5">
                {subtitle}
              </p>
            )}
          </div>
          <Button
            aria-label={closeAriaLabel}
            className="hoverable -mt-1 size-7 shrink-0"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
          </Button>
        </header>
        {children}
      </div>
    </aside>
  );
}
