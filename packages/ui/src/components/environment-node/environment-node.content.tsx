"use client";

import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { normalizeCanvasNodeStatus } from "@workspace/ui/components/canvas-node/canvas-node.status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Check,
  Code2,
  Copy,
  Cpu,
  Ellipsis,
  FileText,
  HardDrive,
  MemoryStick,
  Pause,
  Play,
  RotateCcw,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import type { ComponentType, SVGProps, SyntheticEvent } from "react";

import { useEnvironmentNode } from "./environment-node.context";
import { canCopyEnvironmentLaunchCommand } from "./environment-node.root";
import type {
  EnvironmentNodeAction,
  EnvironmentNodeLifecycleActionKey,
  EnvironmentNodeMetricKey,
  EnvironmentNodeQuickActionKey,
} from "./environment-node.types";
import {
  type EnvironmentRuntimeTone,
  getEnvironmentRuntimeIcon,
  getEnvironmentRuntimeTone,
} from "./environment-runtime-icons";

const RF_CONTROL_CLASS = "nodrag nopan";

const DEFAULT_STATUS = {
  label: "Unknown",
  tone: "unknown",
} as const;

const METRIC_ITEMS = [
  { icon: Cpu, key: "cpu", label: "CPU" },
  { icon: MemoryStick, key: "memory", label: "Memory" },
  { icon: HardDrive, key: "storage", label: "Storage" },
] as const satisfies readonly {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: EnvironmentNodeMetricKey;
  label: string;
}[];

const QUICK_ACTION_ITEMS = [
  { icon: SquareTerminal, key: "terminal", label: "Open terminal" },
  { icon: FileText, key: "logs", label: "Open logs" },
  { icon: Activity, key: "metrics", label: "Open metrics" },
  { icon: Code2, key: "ide", label: "Open IDE" },
] as const satisfies readonly {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: EnvironmentNodeQuickActionKey;
  label: string;
}[];

const ENVIRONMENT_NODE_MENU_ALIGN_OFFSET = -10;
const ENVIRONMENT_NODE_MENU_SIDE_OFFSET = 14;

interface LifecycleActionItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: EnvironmentNodeLifecycleActionKey;
  label: string;
  variant?: "destructive";
}

const LIFECYCLE_ACTION_ITEMS: readonly LifecycleActionItem[] = [
  { icon: Play, key: "start", label: "Start" },
  { icon: Pause, key: "stop", label: "Stop" },
  { icon: RotateCcw, key: "restart", label: "Restart" },
  { icon: Trash2, key: "delete", label: "Delete", variant: "destructive" },
] as const;

function stopNodeControlEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

function formatEnvironmentSubtitle({
  displayRuntime,
  formattedVersion,
}: {
  displayRuntime: string;
  formattedVersion?: string;
}) {
  const runtime = displayRuntime.trim() || "Unknown runtime";

  return `Environment ${runtime}${formattedVersion ? ` ${formattedVersion}` : ""}`;
}

function formatMetricValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}%`;
  }

  const trimmed = value?.trim();

  return trimmed || "--";
}

function getStatusTextClassName(status: EnvironmentNodeStatus) {
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

function getRuntimeToneClassName(tone: EnvironmentRuntimeTone) {
  switch (tone) {
    case "blue":
      return "text-blue-400";
    case "cyan":
      return "text-cyan-400";
    case "green":
      return "text-green-400";
    case "orange":
      return "text-orange-400";
    case "purple":
      return "text-purple-400";
    case "red":
      return "text-red-400";
    case "yellow":
      return "text-yellow-400";
    default:
      return "text-zinc-50";
  }
}

interface EnvironmentNodeStatus {
  label: string;
  tone?: Parameters<typeof normalizeCanvasNodeStatus>[0];
}

function invokeAction(action: EnvironmentNodeAction | undefined) {
  if (!action?.onClick || action.disabled || action.loading) {
    return;
  }

  Promise.resolve(action.onClick()).catch(() => undefined);
}

function renderLaunchCommandCopyIndicator({
  copied,
  copyable,
}: {
  copied: boolean;
  copyable: boolean;
}) {
  if (!copyable) {
    return null;
  }

  if (copied) {
    return <Check aria-hidden className="size-4 shrink-0" />;
  }

  return (
    <Copy
      aria-hidden
      className="environment-node-launch-command-copy-icon size-4 shrink-0 opacity-0 transition-opacity group-hover/launch-command:opacity-100"
    />
  );
}

export function EnvironmentNodeContent() {
  return (
    <CanvasNode.Card surfaceClassName="environment-node-surface">
      <CanvasNode.Header>
        <EnvironmentNodeHeaderContent />
      </CanvasNode.Header>
      <CanvasNode.Body>
        <EnvironmentNodeBodyContent />
      </CanvasNode.Body>
      <CanvasNode.Footer>
        <EnvironmentNodeFooterContent />
      </CanvasNode.Footer>
    </CanvasNode.Card>
  );
}

export function EnvironmentNodeHeaderContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: { states },
  } = useEnvironmentNode();
  const Icon = getEnvironmentRuntimeIcon(states.runtimeKey);
  const runtimeTone = getEnvironmentRuntimeTone(states.runtimeKey);
  const subtitle = formatEnvironmentSubtitle(states);

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5",
            getRuntimeToneClassName(runtimeTone)
          )}
        >
          <Icon aria-hidden className="size-4" strokeWidth={2} />
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
      <EnvironmentNodeHeaderMenu />
    </div>
  );
}

export function EnvironmentNodeBodyContent({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("environment-node-body-content pt-2.5", className)}>
      <EnvironmentNodeLaunchCommand />
      <EnvironmentNodeActionBar />
    </div>
  );
}

export function EnvironmentNodeLaunchCommand({
  className,
}: {
  className?: string;
}) {
  const {
    actions,
    state: { copiedLaunchCommand = false, launchCommand },
  } = useEnvironmentNode();
  const copyable = canCopyEnvironmentLaunchCommand(launchCommand);
  const displayValue = copyable
    ? launchCommand
    : "No launch command configured";

  const copyLaunchCommand = () => {
    if (!(copyable && launchCommand)) {
      return;
    }

    Promise.resolve(actions.copyLaunchCommand(launchCommand)).catch(
      () => undefined
    );
  };

  return (
    <section
      className={cn(
        "group/launch-command environment-node-launch-command-row relative flex min-w-0 flex-col gap-2 rounded-lg bg-zinc-950/20 p-2.5 transition-colors",
        !copyable && "environment-node-launch-command-row-static",
        className
      )}
      data-copyable={copyable || undefined}
      data-slot="environment-node-launch-command-row"
    >
      {copyable ? (
        <button
          aria-label="Copy launch command"
          className={cn(
            RF_CONTROL_CLASS,
            "environment-node-launch-command-copy-hitarea absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline-none"
          )}
          data-slot="environment-node-launch-command-copy"
          onClick={(event) => {
            event.stopPropagation();
            copyLaunchCommand();
          }}
          onDoubleClick={stopNodeControlEvent}
          onKeyDown={stopNodeControlEvent}
          onPointerDown={stopNodeControlEvent}
          title={launchCommand}
          type="button"
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex min-w-0 items-center justify-between gap-2",
          copyable ? "pointer-events-none" : "pointer-events-auto"
        )}
      >
        <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
          Launch command
        </span>
      </div>
      <div
        aria-hidden={copyable ? true : undefined}
        className={cn(
          "relative z-10 flex h-7 min-w-0 items-center justify-between gap-2 py-1.5 text-left font-normal text-xs leading-4",
          copyable
            ? "pointer-events-none text-zinc-50"
            : "text-muted-foreground"
        )}
        data-copied={copiedLaunchCommand ? "true" : undefined}
        data-slot="environment-node-launch-command-value"
        title={launchCommand ?? displayValue}
      >
        <span className="min-w-0 truncate">{displayValue}</span>
        {renderLaunchCommandCopyIndicator({
          copied: copiedLaunchCommand,
          copyable,
        })}
      </div>
    </section>
  );
}

export function EnvironmentNodeActionBar({
  className,
}: {
  className?: string;
}) {
  const {
    actions: { quickActions },
  } = useEnvironmentNode();

  return (
    <div
      className={cn(
        "environment-node-action-bar mt-2 flex min-w-0 items-center justify-end gap-1",
        className
      )}
      data-slot="environment-node-action-bar"
    >
      {QUICK_ACTION_ITEMS.map((item) => {
        const action = quickActions?.[item.key];
        const disabled =
          action?.disabled || action?.loading || !action?.onClick;
        const Icon = item.icon;

        return (
          <Button
            aria-label={item.label}
            className={cn(
              RF_CONTROL_CLASS,
              "environment-node-action-button flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50"
            )}
            disabled={disabled}
            key={item.key}
            onClick={(event) => {
              event.stopPropagation();
              invokeAction(action);
            }}
            onDoubleClick={stopNodeControlEvent}
            onKeyDown={stopNodeControlEvent}
            onPointerDown={stopNodeControlEvent}
            size={null}
            title={item.label}
            type="button"
            variant={null}
          >
            {action?.loading ? (
              <Spinner className="size-4" />
            ) : (
              <Icon aria-hidden className="size-4" />
            )}
          </Button>
        );
      })}
    </div>
  );
}

export function EnvironmentNodeFooterContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: {
      states: { metrics, status = DEFAULT_STATUS },
    },
  } = useEnvironmentNode();
  const statusLabel = status.label.trim() || DEFAULT_STATUS.label;

  return (
    <div
      className={cn(
        "environment-node-footer-content flex w-full min-w-0 items-center justify-between gap-2 text-xs leading-none",
        className
      )}
      data-slot="environment-node-footer-content"
    >
      <span className="flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-full">
        <CanvasNode.StatusDot size="small" status={status} />
        <span className={cn("truncate", getStatusTextClassName(status))}>
          {statusLabel}
        </span>
      </span>
      {METRIC_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = formatMetricValue(metrics?.[item.key]);

        return (
          <span
            className="flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-full text-zinc-50"
            key={item.key}
            title={`${item.label}: ${value}`}
          >
            <Icon aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate tabular-nums">{value}</span>
          </span>
        );
      })}
    </div>
  );
}

function EnvironmentNodeHeaderMenu() {
  const {
    actions: { lifecycleActions },
  } = useEnvironmentNode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open environment actions"
            className={cn(
              RF_CONTROL_CLASS,
              "environment-node-menu-trigger flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50 aria-expanded:bg-white/15 data-popup-open:bg-white/15"
            )}
            onClick={stopNodeControlEvent}
            size={null}
            type="button"
            variant={null}
          />
        }
      >
        <Ellipsis aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={ENVIRONMENT_NODE_MENU_ALIGN_OFFSET}
        className={cn(
          RF_CONTROL_CLASS,
          "environment-node-menu-content w-38 min-w-38 rounded-md border-0 bg-white/5 p-1 text-zinc-50 shadow-none ring-1 ring-white/10 ring-inset"
        )}
        side="right"
        sideOffset={ENVIRONMENT_NODE_MENU_SIDE_OFFSET}
      >
        {LIFECYCLE_ACTION_ITEMS.map((item) => {
          const action = lifecycleActions?.[item.key];
          const disabled =
            action?.disabled || action?.loading || !action?.onClick;
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              className={cn(
                "environment-node-menu-item h-7 cursor-pointer rounded-md px-2 py-0 font-normal text-sm text-zinc-200 leading-none hover:bg-white/15 hover:text-zinc-50 focus:bg-white/15 focus:text-zinc-50",
                item.variant === "destructive" &&
                  "environment-node-menu-item-danger"
              )}
              data-lifecycle-action={item.key}
              disabled={disabled}
              key={item.key}
              onClick={(event) => {
                event.stopPropagation();
                invokeAction(action);
              }}
            >
              {action?.loading ? (
                <Spinner className="size-4" />
              ) : (
                <Icon aria-hidden className="size-4" />
              )}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
