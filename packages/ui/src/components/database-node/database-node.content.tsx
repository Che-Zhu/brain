"use client";

import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { useCanvasNode } from "@workspace/ui/components/canvas-node/canvas-node.context";
import { normalizeCanvasNodeStatus } from "@workspace/ui/components/canvas-node/canvas-node.status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Spinner } from "@workspace/ui/components/spinner";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Check,
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

import { getDatabaseEngineIcon } from "./database-engine-icons";
import { useDatabaseNode } from "./database-node.context";
import { maskDatabaseConnectionString } from "./database-node.mask";
import {
  canCopyDatabaseNodeConnection,
  getDatabaseNodeConnectionKey,
} from "./database-node.root";
import type {
  DatabaseNodeAction,
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

const DATABASE_NODE_MENU_ALIGN_OFFSET = -10;
const DATABASE_NODE_MENU_SIDE_OFFSET = 14;

interface LifecycleActionItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: DatabaseNodeLifecycleActionKey;
  label: string;
  variant?: "destructive";
}

const LIFECYCLE_ACTION_ITEMS: readonly LifecycleActionItem[] = [
  { icon: RotateCcw, key: "restart", label: "Restart" },
  { icon: Trash2, key: "delete", label: "Delete", variant: "destructive" },
  { icon: Pause, key: "stop", label: "Stop" },
  { icon: Play, key: "start", label: "Start" },
] as const;

const ENGINE_ICON_TONES: Record<string, string> = {
  mongodb: "text-green-400",
  mysql: "text-blue-400",
  postgresql: "text-sky-400",
  redis: "text-red-400",
};

function stopNodeControlEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

function getEngineIconClassName(engineKey: string | undefined) {
  if (!engineKey) {
    return "text-zinc-50";
  }

  return ENGINE_ICON_TONES[engineKey.trim().toLowerCase()] ?? "text-zinc-50";
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

function invokeAction(action: DatabaseNodeAction | undefined) {
  if (!action?.onClick || action.disabled || action.loading) {
    return;
  }

  Promise.resolve(action.onClick()).catch(() => undefined);
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
    <CanvasNode.Frame>
      <CanvasNode.ConnectionLayer />
      <CanvasNode.DragStateFrame>
        <CanvasNode.Surface className="database-node-surface">
          <CanvasNode.Header>
            <DatabaseNodeHeaderContent />
          </CanvasNode.Header>
          <CanvasNode.Body>
            <DatabaseNodeBodyContent />
          </CanvasNode.Body>
          <CanvasNode.Footer>
            <DatabaseNodeFooterContent />
          </CanvasNode.Footer>
        </CanvasNode.Surface>
      </CanvasNode.DragStateFrame>
      <CanvasNode.ExpandButton />
    </CanvasNode.Frame>
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
  const iconClassName = getEngineIconClassName(states.engineKey);
  const subtitle = formatDatabaseSubtitle(states);

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon
            aria-hidden
            className={cn("size-4", iconClassName)}
            strokeWidth={2}
          />
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
  const {
    meta: { expanded },
  } = useCanvasNode();

  if (!expanded) {
    return null;
  }

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
        <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
          {connection.label}
        </span>
        {connection.kind === "public" ? (
          <DatabaseNodePublicSwitch connection={connection} index={index} />
        ) : null}
      </div>
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
      className={cn(RF_CONTROL_CLASS, "relative z-20 data-disabled:opacity-70")}
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
    />
  );
}

export function DatabaseNodeActionBar({ className }: { className?: string }) {
  const {
    actions: { quickActions },
  } = useDatabaseNode();

  return (
    <div
      className={cn(
        "database-node-action-bar mt-2 flex min-w-0 items-center justify-end gap-1",
        className
      )}
      data-slot="database-node-action-bar"
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
              "database-node-action-button flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50"
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open database actions"
            className={cn(
              RF_CONTROL_CLASS,
              "database-node-menu-trigger flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-zinc-950/20 p-0 text-zinc-50 shadow-none transition-colors hover:text-zinc-50 aria-expanded:bg-white/15 data-popup-open:bg-white/15"
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
        alignOffset={DATABASE_NODE_MENU_ALIGN_OFFSET}
        className={cn(
          RF_CONTROL_CLASS,
          "database-node-menu-content w-38 min-w-38 rounded-md border-0 bg-white/5 p-1 text-zinc-50 shadow-none ring-1 ring-white/10 ring-inset"
        )}
        side="right"
        sideOffset={DATABASE_NODE_MENU_SIDE_OFFSET}
      >
        {LIFECYCLE_ACTION_ITEMS.map((item) => {
          const action = lifecycleActions?.[item.key];
          const disabled =
            action?.disabled || action?.loading || !action?.onClick;
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              className={cn(
                "database-node-menu-item h-7 cursor-pointer rounded-md px-2 py-0 font-normal text-sm text-zinc-200 leading-none hover:bg-white/15 hover:text-zinc-50 focus:bg-white/15 focus:text-zinc-50",
                item.variant === "destructive" &&
                  "database-node-menu-item-danger"
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
