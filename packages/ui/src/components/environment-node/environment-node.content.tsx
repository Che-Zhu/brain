"use client";

import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Check,
  Code2,
  Copy,
  Cpu,
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

interface LifecycleActionItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: EnvironmentNodeLifecycleActionKey;
  label: string;
  tone?: "destructive" | "info" | "muted" | "success";
}

const LIFECYCLE_ACTION_ITEMS: readonly LifecycleActionItem[] = [
  { icon: Play, key: "start", label: "Start", tone: "success" },
  { icon: Pause, key: "stop", label: "Stop", tone: "muted" },
  { icon: RotateCcw, key: "restart", label: "Restart", tone: "info" },
  { icon: Trash2, key: "delete", label: "Delete", tone: "destructive" },
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

function formatEnvironmentMetricValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}%`;
  }

  const trimmed = value?.trim();

  return trimmed || "--";
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

export function EnvironmentNodeFooterContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: {
      states: { metrics, status },
    },
  } = useEnvironmentNode();

  return (
    <div
      className={cn(
        "environment-node-footer-content flex w-full min-w-0 items-center justify-between gap-2 text-xs leading-none",
        className
      )}
      data-slot="environment-node-footer-content"
    >
      <CanvasNode.FooterStatus status={status} />
      <CanvasNode.Metrics>
        {METRIC_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <CanvasNode.Metric
              key={item.key}
              label={item.label}
              value={formatEnvironmentMetricValue(metrics?.[item.key])}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" />
            </CanvasNode.Metric>
          );
        })}
      </CanvasNode.Metrics>
    </div>
  );
}

function EnvironmentNodeHeaderMenu() {
  const {
    actions: { lifecycleActions },
  } = useEnvironmentNode();

  return (
    <CanvasNode.ActionMenu aria-label="Open environment actions">
      {LIFECYCLE_ACTION_ITEMS.map((item) => {
        const action = lifecycleActions?.[item.key];
        const Icon = item.icon;

        return (
          <CanvasNode.ActionMenuItem
            action={action}
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
  );
}
