"use client";

import { useDbSettingsOperations } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import {
  canCopyDatabaseNodeConnection,
  type DatabaseNodeConnection,
  type DatabaseNodeStatus,
  getDatabaseNodeConnectionKey,
  maskDatabaseConnectionString,
} from "@workspace/ui/components/database-node/database-node";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import {
  Cpu,
  HardDrive,
  Layers,
  type LucideIcon,
  MemoryStick,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import {
  buildDbSettingsPatch,
  type DatabaseSettingsDraft,
  type DatabaseSettingsNumberConstraint,
  type DatabaseSettingsPatch,
  DB_SETTINGS_CPU_LIMIT_CORES,
  DB_SETTINGS_MEMORY_LIMIT_GIB,
  DB_SETTINGS_REPLICA_COUNT,
  DB_SETTINGS_STORAGE_GIB,
  dbSettingsDraftFromNodeData,
  dbSettingsDraftIsDirty,
  normalizeDbSettingsCpuLimitCores,
  normalizeDbSettingsMemoryLimitGi,
  normalizeDbSettingsReplicas,
  normalizeDbSettingsStorageGi,
} from "./database-settings-draft";

interface DatabaseSettingsPaneProps {
  data: CanvasDatabaseNodeData;
  kubeconfig?: string;
  onClose: () => void;
  onUpdated?: () => Promise<unknown>;
}

interface DatabaseSettingsPaneContentProps {
  data: CanvasDatabaseNodeData;
  editable?: boolean;
  onClose: () => void;
  onSubmitPatch?: (patch: DatabaseSettingsPatch) => Promise<unknown> | unknown;
  onUpdated?: () => Promise<unknown>;
  updating?: boolean;
}

function statusPillClassName(status: DatabaseNodeStatus | undefined) {
  switch (status?.tone?.trim().toLowerCase() ?? status?.label.toLowerCase()) {
    case "running":
    case "ready":
      return "bg-database-metrics-status-running text-primary";
    case "failed":
    case "error":
      return "bg-destructive/25 text-destructive";
    case "paused":
    case "stopped":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}

function engineSubtitle({
  displayEngine,
  formattedVersion,
}: CanvasDatabaseNodeData["states"]) {
  return `${displayEngine}${formattedVersion ? ` ${formattedVersion}` : ""}`;
}

function getConnectionAddressDisplayValue(connection: DatabaseNodeConnection) {
  if (connection.kind === "public" && !connection.publicAccess.enabled) {
    return null;
  }
  if (!connection.value) {
    return connection.kind === "private"
      ? (connection.unavailableMessage ?? "Connection unavailable")
      : null;
  }
  return (
    connection.displayValue ?? maskDatabaseConnectionString(connection.value)
  );
}

function shouldShowConnectionAddress(connection: DatabaseNodeConnection) {
  if (connection.kind === "private") {
    return true;
  }
  return connection.publicAccess.enabled && Boolean(connection.value);
}

function DatabaseSettingsConnectionAddressRow({
  connection,
  index,
}: {
  connection: DatabaseNodeConnection;
  index: number;
}) {
  const displayValue = getConnectionAddressDisplayValue(connection);
  if (displayValue === null) {
    return null;
  }

  const copyable = canCopyDatabaseNodeConnection(connection);
  const title =
    connection.kind === "public"
      ? (displayValue ?? undefined)
      : (connection.value ?? displayValue ?? undefined);

  return (
    <CanvasNode.CopyableRow
      className={cn(
        "relative flex min-w-0 flex-col gap-2 rounded-lg bg-zinc-950/20 p-2.5 transition-colors",
        copyable ? "min-h-18" : "min-h-11"
      )}
      copyAriaLabel={`Copy ${connection.label}`}
      copyable={copyable}
      copyValue={connection.value}
      data-slot="database-settings-connection-address-row"
      rowKey={getDatabaseNodeConnectionKey(connection, index)}
      title={title}
    >
      {({ copied, copyable: rowCopyable }) => (
        <>
          <div
            className={cn(
              "relative z-10 flex min-w-0 items-center justify-between gap-2",
              rowCopyable ? "pointer-events-none" : "pointer-events-auto"
            )}
          >
            <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
              {connection.label}
            </span>
          </div>
          <div
            aria-hidden={rowCopyable ? true : undefined}
            className={cn(
              "relative z-10 flex h-7 min-w-0 items-center justify-between gap-2 py-1.5 text-left font-normal text-xs leading-4",
              rowCopyable
                ? "pointer-events-none text-zinc-50"
                : "text-muted-foreground"
            )}
            data-copied={copied ? "true" : undefined}
            data-slot="database-settings-connection-address-value"
            title={title}
          >
            <span className="min-w-0 truncate">{displayValue}</span>
            <CanvasNode.CopyableRowIndicator />
          </div>
        </>
      )}
    </CanvasNode.CopyableRow>
  );
}

function DatabaseSettingsConnectionAddressList({
  connections,
}: {
  connections: readonly DatabaseNodeConnection[];
}) {
  const visibleConnections = connections.filter(shouldShowConnectionAddress);

  if (visibleConnections.length === 0) {
    return (
      <div
        className="flex min-h-11 min-w-0 items-center rounded-lg bg-zinc-950/20 px-2.5 text-muted-foreground text-xs leading-4"
        data-slot="database-settings-connection-address-empty"
      >
        No connection addresses
      </div>
    );
  }

  return (
    <CanvasNode.CopyFeedbackScope>
      <div
        className="flex min-w-0 flex-col gap-2"
        data-slot="database-settings-connection-address-list"
      >
        {visibleConnections.map((connection, index) => (
          <DatabaseSettingsConnectionAddressRow
            connection={connection}
            index={index}
            key={getDatabaseNodeConnectionKey(connection, index)}
          />
        ))}
      </div>
    </CanvasNode.CopyFeedbackScope>
  );
}

function DatabaseSettingsSlider({
  ariaLabel,
  constraint,
  disabled,
  icon,
  label,
  maxDecimals,
  onValueChange,
  value,
}: {
  ariaLabel: string;
  constraint: DatabaseSettingsNumberConstraint;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  maxDecimals: number;
  onValueChange: (value: number) => void;
  value: number;
}) {
  return (
    <ScaleSlider.Root
      disabled={disabled}
      max={constraint.max}
      maxDecimals={maxDecimals}
      min={constraint.min}
      onValueChange={onValueChange}
      step={constraint.step}
      value={value}
      valueDisplay="number"
    >
      <ScaleSlider.Stack className="w-full">
        <ScaleSlider.Header className="min-h-6">
          <ScaleSlider.Group className="min-w-0 gap-2">
            <ScaleSlider.Icon className="shrink-0" icon={icon} />
            <ScaleSlider.Label className="text-card-foreground">
              {label}
            </ScaleSlider.Label>
          </ScaleSlider.Group>
          <div className="flex h-6 min-w-0 items-center justify-end">
            <ScaleSlider.Value />
          </div>
        </ScaleSlider.Header>
        <ScaleSlider.Control aria-label={ariaLabel}>
          <ScaleSlider.Track>
            <ScaleSlider.Range />
          </ScaleSlider.Track>
          <ScaleSlider.Thumb />
        </ScaleSlider.Control>
      </ScaleSlider.Stack>
    </ScaleSlider.Root>
  );
}

export function DatabaseSettingsPane({
  data,
  kubeconfig,
  onClose,
  onUpdated,
}: DatabaseSettingsPaneProps) {
  const readOnly = data.settingsAccess?.readOnly === true;
  const shareToken = data.settingsAccess?.shareToken?.trim() ?? "";
  const { authReady, isUpdating, updateSettings } = useDbSettingsOperations({
    kubeconfig: readOnly ? undefined : kubeconfig,
    shareToken: readOnly ? undefined : shareToken,
  });

  const workload = data.workload;
  const updating = isUpdating(workload);
  const handleSubmitPatch = useCallback(
    (patch: DatabaseSettingsPatch) => updateSettings(workload, patch),
    [updateSettings, workload]
  );

  return (
    <DatabaseSettingsPaneContent
      data={data}
      editable={!readOnly && authReady}
      onClose={onClose}
      onSubmitPatch={!readOnly && authReady ? handleSubmitPatch : undefined}
      onUpdated={onUpdated}
      updating={updating}
    />
  );
}

export function DatabaseSettingsPaneContent({
  data,
  editable = true,
  onClose,
  onSubmitPatch,
  onUpdated,
  updating = false,
}: DatabaseSettingsPaneContentProps) {
  const readOnly = data.settingsAccess?.readOnly === true;
  const canEdit = editable && !readOnly;
  const desired = data.desired;
  const workloadName = data.workload.name.trim();
  const workloadNamespace = data.workload.namespace.trim();
  const desiredCpuLimit = desired?.cpuLimit;
  const desiredExposeNodePort = desired?.exposeNodePort === true;
  const desiredMemoryLimit = desired?.memoryLimit;
  const desiredReplicas = desired?.replicas;
  const desiredStorageSize = desired?.storageSize;
  const originalState = useMemo(() => {
    const draft = dbSettingsDraftFromNodeData({
      desired: {
        ...(desiredCpuLimit === undefined ? {} : { cpuLimit: desiredCpuLimit }),
        exposeNodePort: desiredExposeNodePort,
        ...(desiredMemoryLimit === undefined
          ? {}
          : { memoryLimit: desiredMemoryLimit }),
        ...(desiredReplicas === undefined ? {} : { replicas: desiredReplicas }),
        ...(desiredStorageSize === undefined
          ? {}
          : { storageSize: desiredStorageSize }),
      },
    });

    return {
      draft,
      resetKey: `${workloadNamespace}/${workloadName}`,
    };
  }, [
    desiredCpuLimit,
    desiredExposeNodePort,
    desiredMemoryLimit,
    desiredReplicas,
    desiredStorageSize,
    workloadName,
    workloadNamespace,
  ]);
  const original = originalState.draft;
  const [draft, setDraft] = useState<DatabaseSettingsDraft>(original);

  useEffect(() => {
    setDraft(originalState.draft);
  }, [originalState]);

  const dirty = dbSettingsDraftIsDirty(original, draft);
  const canUpdate = canEdit && dirty && !updating && onSubmitPatch != null;
  const statusLabel = data.states.status?.label ?? "Unknown";
  const subtitle = engineSubtitle(data.states);
  const controlsDisabled = !canEdit || updating;

  const handleCancel = useCallback(() => {
    setDraft(original);
  }, [original]);

  const handleUpdate = useCallback(async () => {
    const patch = buildDbSettingsPatch(original, draft);
    if (!canEdit || patch === null || onSubmitPatch == null) {
      return;
    }
    try {
      await onSubmitPatch(patch);
      toast.success("Database settings updated.");
      await onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update database settings."
      );
    }
  }, [canEdit, draft, onSubmitPatch, onUpdated, original]);

  return (
    <aside className="database-metrics-pane-surface pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-full min-w-0 max-w-xl flex-col gap-6 overflow-hidden px-2.5 py-5 shadow-lg">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-2.5">
        <header className="flex shrink-0 items-start justify-between gap-3 px-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Settings
                  aria-hidden
                  className="size-4 shrink-0 text-database-metrics-chart"
                />
                <h2
                  className="truncate font-semibold text-lg text-primary leading-none"
                  title={data.states.name}
                >
                  {data.states.name}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center rounded-full px-2.5 text-xs leading-none",
                  statusPillClassName(data.states.status)
                )}
              >
                {statusLabel}
              </span>
            </div>
            <p className="truncate text-muted-foreground text-sm leading-5">
              {subtitle}
            </p>
          </div>
          <Button
            aria-label="Close database settings"
            className="hoverable -mt-1 size-7 shrink-0"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
          </Button>
        </header>

        <section className="flex min-w-0 flex-col gap-5 rounded-lg bg-database-metrics-card p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="font-medium text-card-foreground text-sm leading-5">
                Configuration
              </h3>
              <p className="text-muted-foreground text-xs leading-4">
                {dirty ? "Unsaved changes" : "No unsaved changes"}
              </p>
            </div>
            {dirty ? <Badge variant="outline">Draft</Badge> : null}
          </div>

          <Separator />

          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h4 className="font-medium text-card-foreground text-sm leading-5">
                Connection Address
              </h4>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-zinc-950/20 p-2.5">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium text-card-foreground text-sm leading-5">
                  Public connection
                </span>
                <span className="text-muted-foreground text-xs leading-4">
                  {draft.exposeNodePort ? "Enabled" : "Disabled"}
                </span>
              </div>
              <Switch
                aria-label="Public connection"
                checked={draft.exposeNodePort}
                className="shrink-0"
                disabled={controlsDisabled}
                onCheckedChange={(nextEnabled) => {
                  setDraft((current) => ({
                    ...current,
                    exposeNodePort: nextEnabled,
                  }));
                }}
                size="lg"
                variant="brand"
              />
            </div>
            <DatabaseSettingsConnectionAddressList
              connections={data.connections}
            />
          </section>

          <Separator />

          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h4 className="font-medium text-card-foreground text-sm leading-5">
                Replicas & Resources
              </h4>
              <p className="text-muted-foreground text-xs leading-4">
                Replicas 1-10 match the DB schema. CPU and memory limit ranges
                are temporary product defaults for this release.
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <DatabaseSettingsSlider
                ariaLabel="Database replica count"
                constraint={DB_SETTINGS_REPLICA_COUNT}
                disabled={controlsDisabled}
                icon={Layers}
                label="Replicas"
                maxDecimals={0}
                onValueChange={(value) => {
                  setDraft((current) => ({
                    ...current,
                    replicas: normalizeDbSettingsReplicas(value),
                  }));
                }}
                value={draft.replicas}
              />
              <DatabaseSettingsSlider
                ariaLabel="Database CPU limit in cores"
                constraint={DB_SETTINGS_CPU_LIMIT_CORES}
                disabled={controlsDisabled}
                icon={Cpu}
                label="CPU limit (cores)"
                maxDecimals={2}
                onValueChange={(value) => {
                  setDraft((current) => ({
                    ...current,
                    cpuLimitCores: normalizeDbSettingsCpuLimitCores(value),
                  }));
                }}
                value={draft.cpuLimitCores}
              />
              <DatabaseSettingsSlider
                ariaLabel="Database memory limit in Gi"
                constraint={DB_SETTINGS_MEMORY_LIMIT_GIB}
                disabled={controlsDisabled}
                icon={MemoryStick}
                label="Memory limit (Gi)"
                maxDecimals={1}
                onValueChange={(value) => {
                  setDraft((current) => ({
                    ...current,
                    memoryLimitGi: normalizeDbSettingsMemoryLimitGi(value),
                  }));
                }}
                value={draft.memoryLimitGi}
              />
            </div>
          </section>

          <Separator />

          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h4 className="font-medium text-card-foreground text-sm leading-5">
                Storage
              </h4>
              <p className="text-muted-foreground text-xs leading-4">
                Storage is shown in Gi and submitted as a Kubernetes quantity.
                The 1-100Gi range is a temporary product default.
              </p>
            </div>
            <DatabaseSettingsSlider
              ariaLabel="Database storage size in Gi"
              constraint={DB_SETTINGS_STORAGE_GIB}
              disabled={controlsDisabled}
              icon={HardDrive}
              label="Storage size (Gi)"
              maxDecimals={0}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  storageSizeGi: normalizeDbSettingsStorageGi(value),
                }));
              }}
              value={draft.storageSizeGi}
            />
          </section>

          {readOnly ? null : (
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                disabled={!dirty || updating}
                onClick={handleCancel}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={!canUpdate}
                onClick={handleUpdate}
                type="button"
              >
                Update
              </Button>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
