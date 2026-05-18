"use client";

import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Box,
  CalendarDays,
  Cpu,
  FileText,
  Layers,
  MemoryStick,
  Pause,
  Play,
  RotateCcw,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import { type ComponentType, type SVGProps, useState } from "react";

import { useContainerNode } from "./container-node.context";
import { ContainerNodeDeleteDialog } from "./container-node.delete-dialog";
import { containerNodeLifecycleMenuVisibility } from "./container-node.menu-visibility";
import { resolveContainerNodeStatus } from "./container-node.status";
import type {
  ContainerNodeLifecycleActionKey,
  ContainerNodeMetricKey,
  ContainerNodeMetricValue,
  ContainerNodeQuickActionKey,
} from "./container-node.types";

const METRIC_ITEMS = [
  { icon: Cpu, key: "cpu", label: "CPU" },
  { icon: MemoryStick, key: "memory", label: "Memory" },
] as const satisfies readonly {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: ContainerNodeMetricKey;
  label: string;
}[];

const QUICK_ACTION_ITEMS = [
  { icon: Activity, key: "metrics", label: "Open workload metrics" },
  { icon: SquareTerminal, key: "console", label: "Open console" },
  { icon: FileText, key: "logs", label: "Open logs" },
  { icon: CalendarDays, key: "calendar", label: "Open calendar" },
] as const satisfies readonly {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: ContainerNodeQuickActionKey;
  label: string;
}[];

interface LifecycleActionItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: ContainerNodeLifecycleActionKey;
  label: string;
  tone?: "destructive" | "info" | "muted" | "success";
}

const LIFECYCLE_ACTION_ITEMS: readonly LifecycleActionItem[] = [
  { icon: Play, key: "start", label: "Start", tone: "success" },
  { icon: Pause, key: "stop", label: "Stop", tone: "muted" },
  { icon: RotateCcw, key: "restart", label: "Restart", tone: "info" },
  { icon: Trash2, key: "delete", label: "Delete", tone: "destructive" },
] as const;

const CONTAINER_METRIC_PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const CONTAINER_METRIC_PERCENT_PATTERN = /^(-?\d+(?:\.\d+)?)\s*%$/;

function formatContainerSubtitle(kind: string | undefined) {
  const resolvedKind = kind?.trim() || "AP";

  return `${resolvedKind} workload`;
}

function formatContainerMetricPercent(value: number) {
  return Number.isFinite(value)
    ? `${CONTAINER_METRIC_PERCENT_FORMATTER.format(value)}%`
    : "--";
}

export function formatContainerMetricValue(
  value: ContainerNodeMetricValue | undefined
) {
  if (typeof value === "number") {
    return formatContainerMetricPercent(value);
  }

  const trimmed = value?.trim();

  if (!trimmed) {
    return "--";
  }

  const percentMatch = CONTAINER_METRIC_PERCENT_PATTERN.exec(trimmed);
  if (percentMatch) {
    return formatContainerMetricPercent(Number(percentMatch[1]));
  }

  return trimmed;
}

function formatContainerReplicas(replicas: number | undefined) {
  return typeof replicas === "number" && Number.isFinite(replicas)
    ? String(replicas)
    : "--";
}

export function ContainerNodeContent() {
  return (
    <CanvasNode.Card surfaceClassName="container-node-surface">
      <CanvasNode.Header>
        <ContainerNodeHeaderContent />
      </CanvasNode.Header>
      <CanvasNode.Body>
        <ContainerNodeBodyContent />
      </CanvasNode.Body>
      <CanvasNode.Footer>
        <ContainerNodeFooterContent />
      </CanvasNode.Footer>
    </CanvasNode.Card>
  );
}

export function ContainerNodeHeaderContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: { states },
  } = useContainerNode();
  const subtitle = formatContainerSubtitle(states.kind);

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Box aria-hidden className="size-4" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            className="min-w-0 truncate font-normal text-sm text-zinc-50 leading-5"
            title={states.name}
          >
            {states.name}
          </span>
          <span
            className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4"
            title={subtitle}
          >
            {subtitle}
          </span>
        </span>
      </span>
      <ContainerNodeHeaderMenu />
    </div>
  );
}

export function ContainerNodeBodyContent({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("container-node-body-content pt-2.5", className)}>
      <ContainerNodeImageRow />
      <ContainerNodeActionBar />
    </div>
  );
}

export function ContainerNodeImageRow({ className }: { className?: string }) {
  const {
    state: {
      states: { image },
    },
  } = useContainerNode();
  const displayImage = image.trim() || "--";

  return (
    <div
      className={cn(
        "container-node-image-row flex min-w-0 flex-col gap-2 rounded-lg bg-zinc-950/20 p-2.5",
        className
      )}
      data-slot="container-node-image-row"
    >
      <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
        Image
      </span>
      <span
        className="min-w-0 truncate font-mono text-xs text-zinc-50 leading-4"
        title={displayImage === "--" ? undefined : displayImage}
      >
        {displayImage}
      </span>
    </div>
  );
}

export function ContainerNodeActionBar({ className }: { className?: string }) {
  const {
    actions: { quickActions },
  } = useContainerNode();

  return (
    <CanvasNode.ActionBar className={className}>
      {QUICK_ACTION_ITEMS.map((item) => {
        const action = quickActions?.[item.key];
        const Icon = item.icon;

        return (
          <CanvasNode.ActionButton
            action={action}
            aria-label={item.label}
            key={item.key}
            title={item.label}
          >
            <Icon aria-hidden className="size-4" />
          </CanvasNode.ActionButton>
        );
      })}
    </CanvasNode.ActionBar>
  );
}

export function ContainerNodeFooterContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: {
      states: { metrics, replicas, status },
    },
  } = useContainerNode();
  const visualStatus = resolveContainerNodeStatus(status);

  return (
    <div
      className={cn(
        "container-node-footer-content flex w-full min-w-0 items-center justify-between gap-2 text-xs leading-none",
        className
      )}
      data-slot="container-node-footer-content"
    >
      <CanvasNode.FooterStatus status={visualStatus} />
      <CanvasNode.Metrics>
        {METRIC_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <CanvasNode.Metric
              key={item.key}
              label={item.label}
              value={formatContainerMetricValue(metrics?.[item.key])}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" />
            </CanvasNode.Metric>
          );
        })}
        <CanvasNode.Metric
          label="Replicas"
          value={formatContainerReplicas(replicas)}
        >
          <Layers aria-hidden className="size-3.5 shrink-0" />
        </CanvasNode.Metric>
      </CanvasNode.Metrics>
    </div>
  );
}

function ContainerNodeHeaderMenu() {
  const {
    actions: { lifecycleActions },
    state: {
      states: { kind, name, status },
    },
  } = useContainerNode();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { showRestart, showStart, showStop } =
    containerNodeLifecycleMenuVisibility(status?.tone ?? status?.label);
  const deleteAction = lifecycleActions?.delete;

  return (
    <>
      <CanvasNode.ActionMenu aria-label="Open workload actions">
        {LIFECYCLE_ACTION_ITEMS.map((item) => {
          if (item.key === "start" && !showStart) {
            return null;
          }
          if (item.key === "stop" && !showStop) {
            return null;
          }
          if (item.key === "restart" && !showRestart) {
            return null;
          }

          const action = lifecycleActions?.[item.key];
          const menuAction =
            item.key === "delete" && action != null
              ? { ...action, onClick: () => setDeleteDialogOpen(true) }
              : action;
          const Icon = item.icon;

          return (
            <CanvasNode.ActionMenuItem
              action={menuAction}
              actionKey={item.key}
              icon={<Icon aria-hidden className="size-4" />}
              key={item.key}
              tone={item.tone}
            >
              {item.label}
            </CanvasNode.ActionMenuItem>
          );
        })}
      </CanvasNode.ActionMenu>
      <ContainerNodeDeleteDialog
        kind={kind}
        name={name}
        onConfirmDelete={deleteAction?.onClick}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </>
  );
}
