"use client";

import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { normalizeCanvasNodeStatus } from "@workspace/ui/components/canvas-node/canvas-node.status";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Check,
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

import { getDatabaseEngineIcon } from "./database-engine-icons";
import { useDatabaseNode } from "./database-node.context";
import { maskDatabaseConnectionString } from "./database-node.mask";
import {
  canCopyDatabaseNodeConnection,
  getDatabaseNodeConnectionKey,
} from "./database-node.root";
import type {
  DatabaseNodeConnection,
  DatabaseNodeLifecycleActionKey,
  DatabaseNodeMetricKey,
  DatabaseNodePublicConnection,
  DatabaseNodeQuickActionKey,
} from "./database-node.types";

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
  key: DatabaseNodeMetricKey;
  label: string;
}[];

const QUICK_ACTION_ITEMS = [
  { icon: Activity, key: "metrics", label: "Open metrics" },
  { icon: SquareTerminal, key: "console", label: "Open database console" },
  { icon: FileText, key: "logs", label: "Open logs" },
] as const satisfies readonly {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: DatabaseNodeQuickActionKey;
  label: string;
}[];

interface LifecycleActionItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: DatabaseNodeLifecycleActionKey;
  label: string;
  tone?: "destructive" | "info" | "muted" | "success";
}

const LIFECYCLE_ACTION_ITEMS: readonly LifecycleActionItem[] = [
  { icon: RotateCcw, key: "restart", label: "Restart", tone: "info" },
  { icon: Trash2, key: "delete", label: "Delete", tone: "destructive" },
  { icon: Pause, key: "stop", label: "Stop", tone: "muted" },
  { icon: Play, key: "start", label: "Start", tone: "success" },
] as const;

function stopNodeControlEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

function formatDatabaseSubtitle({
  displayEngine,
  formattedVersion,
}: {
  displayEngine: string;
  formattedVersion?: string;
}) {
  return `Database ${displayEngine}${formattedVersion ? ` ${formattedVersion}` : ""}`;
}

function formatMetricValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}%`;
  }

  const trimmed = value?.trim();

  return trimmed || "--";
}

function getStatusTextClassName(status: DatabaseNodeConnectionStatus) {
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

interface DatabaseNodeConnectionStatus {
  label: string;
  tone?: Parameters<typeof normalizeCanvasNodeStatus>[0];
}

function getConnectionDisplayValue(connection: DatabaseNodeConnection) {
  if (connection.kind === "public" && !connection.publicAccess.enabled) {
    return null;
  }

  if (connection.value) {
    return (
      connection.displayValue ?? maskDatabaseConnectionString(connection.value)
    );
  }

  if (connection.kind === "public") {
    return connection.provisioningMessage ?? "Provisioning connection string";
  }

  return connection.unavailableMessage ?? "Connection unavailable";
}

function renderConnectionCopyIndicator({
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
      className="database-node-connection-copy-icon size-4 shrink-0 opacity-0 transition-opacity group-hover/connection:opacity-100"
    />
  );
}

export function DatabaseNodeContent() {
  return (
    <CanvasNode.Card surfaceClassName="database-node-surface">
      <CanvasNode.Header>
        <DatabaseNodeHeaderContent />
      </CanvasNode.Header>
      <CanvasNode.Body>
        <DatabaseNodeBodyContent />
      </CanvasNode.Body>
      <CanvasNode.Footer>
        <DatabaseNodeFooterContent />
      </CanvasNode.Footer>
    </CanvasNode.Card>
  );
}

export function DatabaseNodeHeaderContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: { states },
  } = useDatabaseNode();
  const Icon = getDatabaseEngineIcon(states.engineKey);
  const subtitle = formatDatabaseSubtitle(states);

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
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
      <DatabaseNodeHeaderMenu />
    </div>
  );
}

export function DatabaseNodeBodyContent({ className }: { className?: string }) {
  return (
    <div className={cn("database-node-body-content pt-2.5", className)}>
      <DatabaseNodeConnectionList />
      <DatabaseNodeActionBar />
    </div>
  );
}

export function DatabaseNodeConnectionList({
  className,
}: {
  className?: string;
}) {
  const {
    state: { connections = [] },
  } = useDatabaseNode();
  const scrollable = connections.length > 2;

  if (connections.length === 0) {
    return (
      <div
        className={cn(
          "database-node-connection-empty flex min-w-0 items-center rounded-lg bg-zinc-950/20 px-2.5 text-muted-foreground text-xs leading-4",
          className
        )}
        data-slot="database-node-connection-empty"
      >
        No connections
      </div>
    );
  }

  return (
    <div
      className={cn(
        "database-node-connection-list flex min-w-0 flex-col gap-2",
        className
      )}
      data-scrollable={scrollable || undefined}
      data-slot="database-node-connection-list"
    >
      {connections.map((connection, index) => (
        <DatabaseNodeConnectionRow
          connection={connection}
          index={index}
          key={getDatabaseNodeConnectionKey(connection, index)}
        />
      ))}
    </div>
  );
}

export function DatabaseNodeConnectionRow({
  className,
  connection,
  index,
}: {
  className?: string;
  connection: DatabaseNodeConnection;
  index: number;
}) {
  const {
    actions,
    state: { copiedConnectionKey },
  } = useDatabaseNode();
  const copyable = canCopyDatabaseNodeConnection(connection);
  const copied =
    copiedConnectionKey === getDatabaseNodeConnectionKey(connection, index);
  const displayValue = getConnectionDisplayValue(connection);
  const publicSwitch =
    connection.kind === "public" ? (
      <DatabaseNodePublicSwitch connection={connection} index={index} />
    ) : null;

  const copyConnection = () => {
    if (!copyable) {
      return;
    }

    Promise.resolve(actions.copyConnection(connection, index)).catch(
      () => undefined
    );
  };

  return (
    <section
      className={cn(
        "group/connection database-node-connection-row relative flex min-w-0 flex-col gap-2 rounded-lg bg-zinc-950/20 p-2.5 transition-colors",
        displayValue ? "min-h-18" : "min-h-11",
        !copyable && "database-node-connection-row-static",
        className
      )}
      data-copyable={copyable || undefined}
      data-slot="database-node-connection-row"
    >
      {copyable ? (
        <button
          aria-label={`Copy ${connection.label}`}
          className={cn(
            RF_CONTROL_CLASS,
            "database-node-connection-copy-hitarea absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline-none"
          )}
          data-slot="database-node-connection-copy"
          onClick={(event) => {
            event.stopPropagation();
            copyConnection();
          }}
          onDoubleClick={stopNodeControlEvent}
          onKeyDown={stopNodeControlEvent}
          onPointerDown={stopNodeControlEvent}
          title={connection.value}
          type="button"
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex min-w-0 items-center justify-between gap-2",
          copyable ? "pointer-events-none" : "pointer-events-auto"
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate font-normal text-muted-foreground text-xs leading-4",
            copyable && publicSwitch && "pr-12"
          )}
        >
          {connection.label}
        </span>
        {copyable ? null : publicSwitch}
      </div>
      {copyable && publicSwitch ? (
        <div
          className={cn(
            RF_CONTROL_CLASS,
            "pointer-events-auto absolute top-2.5 right-2.5 z-20 flex"
          )}
        >
          {publicSwitch}
        </div>
      ) : null}
      {displayValue ? (
        <div
          aria-hidden={copyable ? true : undefined}
          className={cn(
            "relative z-10 flex h-7 min-w-0 items-center justify-between gap-2 py-1.5 text-left font-normal text-xs leading-4",
            copyable
              ? "pointer-events-none text-zinc-50"
              : "text-muted-foreground"
          )}
          data-copied={copied ? "true" : undefined}
          data-slot="database-node-connection-value"
          title={connection.value ?? displayValue}
        >
          <span className="min-w-0 truncate">{displayValue}</span>
          {renderConnectionCopyIndicator({ copied, copyable })}
        </div>
      ) : null}
    </section>
  );
}

function DatabaseNodePublicSwitch({
  connection,
  index,
}: {
  connection: DatabaseNodePublicConnection;
  index: number;
}) {
  const { actions } = useDatabaseNode();
  const disabled =
    connection.publicAccess.loading || !actions.togglePublicConnection;

  return (
    <Switch
      aria-label={
        connection.publicAccess.enabled
          ? "Disable public connection"
          : "Enable public connection"
      }
      checked={connection.publicAccess.enabled}
      className={cn(
        RF_CONTROL_CLASS,
        "database-node-public-switch pointer-events-auto relative z-20 cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-70"
      )}
      disabled={disabled}
      onCheckedChange={(nextEnabled) => {
        if (!actions.togglePublicConnection) {
          return;
        }

        Promise.resolve(
          actions.togglePublicConnection(connection, index, nextEnabled)
        ).catch(() => undefined);
      }}
      onClick={stopNodeControlEvent}
      onDoubleClick={stopNodeControlEvent}
      onKeyDown={stopNodeControlEvent}
      onPointerDown={stopNodeControlEvent}
      size="lg"
      variant="brand"
    />
  );
}

export function DatabaseNodeActionBar({ className }: { className?: string }) {
  const {
    actions: { quickActions },
  } = useDatabaseNode();

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

export function DatabaseNodeFooterContent({
  className,
}: {
  className?: string;
}) {
  const {
    state: {
      states: { metrics, status = DEFAULT_STATUS },
    },
  } = useDatabaseNode();
  const statusLabel = status.label.trim() || DEFAULT_STATUS.label;

  return (
    <div
      className={cn(
        "database-node-footer-content flex w-full min-w-0 items-center justify-between gap-2 text-xs leading-none",
        className
      )}
      data-slot="database-node-footer-content"
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

function DatabaseNodeHeaderMenu() {
  const {
    actions: { lifecycleActions },
  } = useDatabaseNode();

  return (
    <CanvasNode.ActionMenu aria-label="Open database actions">
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
