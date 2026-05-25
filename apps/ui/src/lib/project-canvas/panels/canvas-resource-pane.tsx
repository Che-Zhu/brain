"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface CanvasResourcePaneProps {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeAriaLabel?: string;
  icon?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}

export function CanvasResourcePane({
  bodyClassName,
  children,
  className,
  closeAriaLabel = "Close resource pane",
  icon,
  onClose,
  subtitle,
  title,
}: CanvasResourcePaneProps) {
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
