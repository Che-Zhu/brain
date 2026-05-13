"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Activity, Calendar, FileText, SquareTerminal } from "lucide-react";
import type { ComponentProps, SyntheticEvent } from "react";

/**
 * React Flow: keep controls draggable/pannable per
 * https://reactflow.dev/learn/customization/utility-classes
 */
const RF_INTERACTIVE_CLASS = "nodrag nopan";

/** Match `Chat.Export` — one control per callback, composed by the host. */
const toolbarControlClass = "hoverable rounded-xl";

function stopCanvasNodeClick(e: SyntheticEvent) {
  e.stopPropagation();
}

type ToolbarButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick" | "size" | "type" | "variant"
>;

export type ContainerNodeToolbarActivityProps = ToolbarButtonProps & {
  onViewActivity?: () => void;
};

export function ContainerNodeToolbarActivity({
  className,
  onViewActivity,
  ...props
}: ContainerNodeToolbarActivityProps) {
  return (
    <Button
      aria-label="Activity"
      className={cn(toolbarControlClass, RF_INTERACTIVE_CLASS, className)}
      disabled={onViewActivity == null}
      onClick={(e) => {
        stopCanvasNodeClick(e);
        onViewActivity?.();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <Activity aria-hidden className="size-3.5" />
    </Button>
  );
}

export type ContainerNodeToolbarShellProps = ToolbarButtonProps & {
  onOpenShell?: () => void;
};

export function ContainerNodeToolbarShell({
  className,
  onOpenShell,
  ...props
}: ContainerNodeToolbarShellProps) {
  return (
    <Button
      aria-label="Open shell"
      className={cn(toolbarControlClass, RF_INTERACTIVE_CLASS, className)}
      disabled={onOpenShell == null}
      onClick={(e) => {
        stopCanvasNodeClick(e);
        onOpenShell?.();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <SquareTerminal aria-hidden className="size-3.5" />
    </Button>
  );
}

export type ContainerNodeToolbarLogsProps = ToolbarButtonProps & {
  onViewLogs?: () => void;
};

export function ContainerNodeToolbarLogs({
  className,
  onViewLogs,
  ...props
}: ContainerNodeToolbarLogsProps) {
  return (
    <Button
      aria-label="View logs"
      className={cn(toolbarControlClass, RF_INTERACTIVE_CLASS, className)}
      disabled={onViewLogs == null}
      onClick={(e) => {
        stopCanvasNodeClick(e);
        onViewLogs?.();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <FileText aria-hidden className="size-3.5" />
    </Button>
  );
}

export type ContainerNodeToolbarCalendarProps = ToolbarButtonProps & {
  onViewCalendar?: () => void;
};

export function ContainerNodeToolbarCalendar({
  className,
  onViewCalendar,
  ...props
}: ContainerNodeToolbarCalendarProps) {
  return (
    <Button
      aria-label="Calendar"
      className={cn(toolbarControlClass, RF_INTERACTIVE_CLASS, className)}
      disabled={onViewCalendar == null}
      onClick={(e) => {
        stopCanvasNodeClick(e);
        onViewCalendar?.();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <Calendar aria-hidden className="size-3.5" />
    </Button>
  );
}

ContainerNodeToolbarActivity.displayName = "ContainerNode.ToolbarActivity";
ContainerNodeToolbarShell.displayName = "ContainerNode.ToolbarShell";
ContainerNodeToolbarLogs.displayName = "ContainerNode.ToolbarLogs";
ContainerNodeToolbarCalendar.displayName = "ContainerNode.ToolbarCalendar";
