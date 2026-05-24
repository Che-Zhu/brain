"use client";

import { useDbSettingsOperations } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import {
  canCopyDatabaseNodeConnection,
  type DatabaseNodeConnection,
  type DatabaseNodePublicConnection,
  getDatabaseNodeConnectionKey,
  maskDatabaseConnectionString,
} from "@workspace/ui/components/database-node/database-node";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { Switch } from "@workspace/ui/components/switch";
import {
  applySettingsDraftBackingResult,
  commitSettingsDraftBackingState,
  createSettingsDraftBackingState,
  failSettingsDraftSave,
  keepEditingSettingsDraftBackingState,
  reloadSettingsDraftBackingState,
  syncSettingsDraftBackingState,
} from "@workspace/ui/lib/settings-draft-backing";
import { cn } from "@workspace/ui/lib/utils";
import {
  Cpu,
  Database,
  HardDrive,
  type LucideIcon,
  MemoryStick,
  Network,
  Settings2,
  Upload,
} from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { routingDomainFromKubeconfig } from "@/lib/kubeconfig-routing-domain";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { CanvasResourcePane } from "./canvas-resource-pane";
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
import type { SettingsLeaveGuardRegistration } from "./settings-leave-guard";

interface DatabaseSettingsPaneProps {
  data: CanvasDatabaseNodeData;
  kubeconfig?: string;
  onClose: () => void;
  onSettingsLeaveGuardChange?: SettingsLeaveGuardRegistration;
  onUpdated?: () => Promise<unknown>;
}

interface DatabaseSettingsPaneContentProps {
  data: CanvasDatabaseNodeData;
  editable?: boolean;
  onClose: () => void;
  onSettingsLeaveGuardChange?: SettingsLeaveGuardRegistration;
  onSubmitPatch?: (patch: DatabaseSettingsPatch) => Promise<unknown> | unknown;
  onUpdated?: () => Promise<unknown>;
  routingDomain?: string;
  updating?: boolean;
}

function databaseHeaderSubtitle({
  displayEngine,
  formattedVersion,
}: CanvasDatabaseNodeData["states"]) {
  return `Database ${displayEngine}${formattedVersion ? ` ${formattedVersion}` : ""}`;
}

function formatReplicasValue(value: number) {
  return `${value} ${value === 1 ? "Replica" : "Replicas"}`;
}

function formatCpuValue(value: number) {
  const formatted = Number.isInteger(value) ? String(value) : String(value);
  return `${formatted} ${value === 1 ? "Core" : "Cores"}`;
}

function formatGiValue(value: number) {
  if (value < 1) {
    return `${Math.round(value * 1024)} Mi`;
  }
  return `${Number.isInteger(value) ? value : value.toFixed(1)} Gi`;
}

function displayConnectionLabel(connection: DatabaseNodeConnection) {
  if (connection.kind === "private") {
    return "Private Connection";
  }
  return "Public Connection";
}

function getConnectionAddressDisplayValue(
  connection: DatabaseNodeConnection,
  publicConnectionEnabled = connection.kind === "public"
    ? connection.publicAccess.enabled
    : false
) {
  if (connection.kind === "public" && !publicConnectionEnabled) {
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

function shouldShowConnectionAddress(connection: DatabaseNodeConnection) {
  return connection.kind === "private" || connection.kind === "public";
}

function DatabaseSettingsHeaderIcon({ iconUrl }: { iconUrl?: string }) {
  const resolvedIconUrl = iconUrl?.trim();
  if (resolvedIconUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: DB icons are arbitrary remote URLs that are not covered by Next image domain config.
      <img
        alt=""
        className="size-4 object-contain"
        decoding="async"
        height={16}
        loading="lazy"
        src={resolvedIconUrl}
        width={16}
      />
    );
  }
  return <Database aria-hidden className="size-4 shrink-0 text-theme-blue" />;
}

function DatabaseSettingsSection({
  children,
  className,
  icon: Icon,
  title,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-transparent",
        className
      )}
      {...props}
    >
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-border border-b px-2.5">
        <Icon aria-hidden className="size-4 shrink-0 text-card-foreground" />
        <h3 className="truncate font-medium text-card-foreground text-sm leading-5">
          {title}
        </h3>
      </header>
      <div className="flex min-w-0 flex-col gap-3 px-2.5 pb-3">{children}</div>
    </section>
  );
}

function DatabaseSettingsSlider({
  ariaLabel,
  constraint,
  disabled,
  formatBound,
  formatValue,
  icon,
  label,
  maxDecimals,
  onValueChange,
  value,
}: {
  ariaLabel: string;
  constraint: DatabaseSettingsNumberConstraint;
  disabled: boolean;
  formatBound?: (value: number) => string;
  formatValue: (value: number) => string;
  icon?: LucideIcon;
  label: string;
  maxDecimals: number;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const Icon = icon;
  const boundFormatter = formatBound ?? String;

  return (
    <div className="rounded-lg bg-database-metrics-card p-2.5">
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
        <ScaleSlider.Stack className="w-full gap-1.5">
          <ScaleSlider.Header className="mb-0.5 h-9">
            <ScaleSlider.Group className="min-w-0 gap-1.5">
              {Icon == null ? null : (
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              <ScaleSlider.Label className="truncate text-muted-foreground text-sm leading-5">
                {label}
              </ScaleSlider.Label>
            </ScaleSlider.Group>
            <span className="shrink-0 text-primary text-sm leading-5">
              {formatValue(value)}
            </span>
          </ScaleSlider.Header>
          <ScaleSlider.Control aria-label={ariaLabel} className="h-2">
            <ScaleSlider.Track className="h-2 bg-input/80">
              <ScaleSlider.Range className="bg-gradient-to-r from-blue-950 to-theme-blue" />
            </ScaleSlider.Track>
            <ScaleSlider.Thumb className="size-4 border-2 border-primary bg-theme-blue shadow-none ring-0" />
          </ScaleSlider.Control>
          <div className="flex min-w-0 items-center justify-between gap-3 text-muted-foreground text-sm leading-5">
            <span className="truncate">{boundFormatter(constraint.min)}</span>
            <span className="truncate text-right">
              {boundFormatter(constraint.max)}
            </span>
          </div>
        </ScaleSlider.Stack>
      </ScaleSlider.Root>
    </div>
  );
}

function DatabaseSettingsConnectionAddressRow({
  connection,
  controlsDisabled,
  index,
  onPublicConnectionChange,
  publicConnectionEnabled,
}: {
  connection: DatabaseNodeConnection;
  controlsDisabled: boolean;
  index: number;
  onPublicConnectionChange: (nextEnabled: boolean) => void;
  publicConnectionEnabled: boolean;
}) {
  const displayValue = getConnectionAddressDisplayValue(
    connection,
    publicConnectionEnabled
  );
  const displayLabel = displayConnectionLabel(connection);
  const copyable =
    connection.kind === "public"
      ? publicConnectionEnabled && Boolean(connection.value)
      : canCopyDatabaseNodeConnection(connection);
  const copyValue = copyable ? connection.value : undefined;
  const title =
    connection.kind === "public"
      ? (displayValue ?? undefined)
      : (connection.value ?? displayValue ?? undefined);
  const publicSwitch =
    connection.kind === "public" ? (
      <CanvasNode.CopyableRowControl className="pointer-events-auto relative z-20 flex shrink-0 items-center">
        <DatabaseSettingsPublicConnectionSwitch
          connection={connection}
          controlsDisabled={controlsDisabled}
          onCheckedChange={onPublicConnectionChange}
          publicConnectionEnabled={publicConnectionEnabled}
        />
      </CanvasNode.CopyableRowControl>
    ) : null;

  return (
    <CanvasNode.CopyableRow
      className={cn(
        "relative flex min-w-0 flex-col gap-2 rounded-lg bg-zinc-950/20 p-2.5 shadow-sm transition-colors",
        displayValue ? "min-h-20" : "min-h-11"
      )}
      copyAriaLabel={`Copy ${displayLabel}`}
      copyable={copyable}
      copyValue={copyValue}
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
            <span className="min-w-0 truncate text-muted-foreground text-sm leading-5">
              {displayLabel}
            </span>
            {publicSwitch}
          </div>
          {displayValue === null ? null : (
            <div
              aria-hidden={rowCopyable ? true : undefined}
              className={cn(
                "relative z-10 flex h-8 min-w-0 items-center justify-between gap-2 py-1.5 text-left text-sm leading-5",
                rowCopyable
                  ? "pointer-events-none text-primary"
                  : "text-muted-foreground"
              )}
              data-copied={copied ? "true" : undefined}
              data-slot="database-settings-connection-address-value"
              title={title}
            >
              <span className="min-w-0 truncate">{displayValue}</span>
              <CanvasNode.CopyableRowIndicator />
            </div>
          )}
        </>
      )}
    </CanvasNode.CopyableRow>
  );
}

function DatabaseSettingsPublicConnectionSwitch({
  connection,
  controlsDisabled,
  onCheckedChange,
  publicConnectionEnabled,
}: {
  connection: DatabaseNodePublicConnection;
  controlsDisabled: boolean;
  onCheckedChange: (nextEnabled: boolean) => void;
  publicConnectionEnabled: boolean;
}) {
  return (
    <Switch
      aria-label="Public connection"
      checked={publicConnectionEnabled}
      className="shrink-0"
      disabled={controlsDisabled || connection.publicAccess.loading === true}
      onCheckedChange={onCheckedChange}
      size="lg"
      variant="brand"
    />
  );
}

function DatabaseSettingsConnectionAddressList({
  connections,
  controlsDisabled,
  onPublicConnectionChange,
  publicConnectionEnabled,
}: {
  connections: readonly DatabaseNodeConnection[];
  controlsDisabled: boolean;
  onPublicConnectionChange: (nextEnabled: boolean) => void;
  publicConnectionEnabled: boolean;
}) {
  const visibleConnections = connections.filter(shouldShowConnectionAddress);

  if (visibleConnections.length === 0) {
    return (
      <div
        className="flex min-h-11 min-w-0 items-center rounded-lg bg-zinc-950/20 px-2.5 text-muted-foreground text-sm leading-5"
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
            controlsDisabled={controlsDisabled}
            index={index}
            key={getDatabaseNodeConnectionKey(connection, index)}
            onPublicConnectionChange={onPublicConnectionChange}
            publicConnectionEnabled={publicConnectionEnabled}
          />
        ))}
      </div>
    </CanvasNode.CopyFeedbackScope>
  );
}

function DatabaseSettingsFooter({
  backingResourceChanged,
  canUpdate,
  dirty,
  onKeepEditing,
  onReload,
  onUpdate,
  saveFailureMessage,
  updating,
}: {
  backingResourceChanged: boolean;
  canUpdate: boolean;
  dirty: boolean;
  onKeepEditing: () => void;
  onReload: () => void;
  onUpdate: () => void;
  saveFailureMessage: string | null;
  updating: boolean;
}) {
  return (
    <footer className="flex shrink-0 flex-col gap-2 p-2.5">
      {backingResourceChanged ? (
        <div
          className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-theme-yellow/40 bg-theme-yellow/10 px-2.5 py-2 text-theme-yellow text-xs leading-4"
          role="status"
        >
          <span className="min-w-0 truncate">Backing resource changed.</span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              className="h-7 px-2 text-xs"
              onClick={onReload}
              type="button"
              variant="ghost"
            >
              Reload
            </Button>
            <Button
              className="h-7 px-2 text-xs"
              onClick={onKeepEditing}
              type="button"
              variant="ghost"
            >
              Keep editing
            </Button>
          </div>
        </div>
      ) : null}
      {saveFailureMessage == null ? null : (
        <p className="text-destructive text-xs leading-4" role="alert">
          {saveFailureMessage}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "min-w-0 truncate text-theme-yellow text-xs leading-4",
            !dirty && "invisible"
          )}
        >
          Unsaved configuration changes.
        </p>
        <Button
          className="h-9 rounded-lg bg-database-metrics-card px-4 text-primary hover:bg-database-metrics-card/80"
          disabled={!canUpdate}
          onClick={onUpdate}
          type="button"
          variant="ghost"
        >
          <Upload aria-hidden className="size-4" />
          {updating ? "Updating" : "Update"}
        </Button>
      </div>
    </footer>
  );
}

function databaseSettingsBackingKey(
  identityKey: string,
  draft: DatabaseSettingsDraft
) {
  return JSON.stringify({ draft, identityKey });
}

export function DatabaseSettingsPane({
  data,
  kubeconfig,
  onClose,
  onSettingsLeaveGuardChange,
  onUpdated,
}: DatabaseSettingsPaneProps) {
  const readOnly = data.settingsAccess?.readOnly === true;
  const shareToken = data.settingsAccess?.shareToken?.trim() ?? "";
  const routingDomain = useMemo(
    () => (readOnly ? "" : routingDomainFromKubeconfig(kubeconfig ?? "")),
    [kubeconfig, readOnly]
  );
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
      onSettingsLeaveGuardChange={onSettingsLeaveGuardChange}
      onSubmitPatch={!readOnly && authReady ? handleSubmitPatch : undefined}
      onUpdated={onUpdated}
      routingDomain={routingDomain}
      updating={updating}
    />
  );
}

export function DatabaseSettingsPaneContent({
  data,
  editable = true,
  onClose,
  onSettingsLeaveGuardChange,
  onSubmitPatch,
  onUpdated,
  routingDomain,
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
  const identityKey = `${workloadNamespace}/${workloadName}`;
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
      backingKey: databaseSettingsBackingKey(identityKey, draft),
      draft,
      identityKey,
    };
  }, [
    desiredCpuLimit,
    desiredExposeNodePort,
    desiredMemoryLimit,
    desiredReplicas,
    desiredStorageSize,
    identityKey,
  ]);
  const [draft, setDraft] = useState<DatabaseSettingsDraft>(
    originalState.draft
  );
  const [backingState, setBackingState] = useState(() =>
    createSettingsDraftBackingState(
      originalState.draft,
      originalState.backingKey,
      originalState.identityKey
    )
  );
  const original = backingState.base;

  useEffect(() => {
    const synced = syncSettingsDraftBackingState(backingState, {
      backing: originalState.draft,
      backingKey: originalState.backingKey,
      draft,
      identityKey: originalState.identityKey,
      isDirty: dbSettingsDraftIsDirty,
    });
    if (synced.state === backingState && synced.draft === undefined) {
      return;
    }
    applySettingsDraftBackingResult(synced, {
      draft: setDraft,
      state: setBackingState,
    });
  }, [backingState, draft, originalState]);

  const pendingPatch = useMemo(
    () =>
      buildDbSettingsPatch(original, draft, {
        metadata: data.metadata,
        routingDomain,
      }),
    [data.metadata, draft, original, routingDomain]
  );
  const dirty =
    pendingPatch !== null || dbSettingsDraftIsDirty(original, draft);
  const canUpdate =
    canEdit && pendingPatch !== null && !updating && onSubmitPatch != null;
  const subtitle = databaseHeaderSubtitle(data.states);
  const controlsDisabled = !canEdit || updating;

  const saveSettingsDraft = useCallback(async () => {
    const patch = pendingPatch;
    if (!canEdit || patch === null || onSubmitPatch == null) {
      throw new Error("Database settings draft cannot be saved yet.");
    }
    setBackingState((current) => ({ ...current, saveFailureMessage: null }));
    try {
      await onSubmitPatch(patch);
      setBackingState((current) =>
        commitSettingsDraftBackingState(current, draft)
      );
      toast.success("Database settings updated.");
      await onUpdated?.();
    } catch (error) {
      setBackingState((current) =>
        failSettingsDraftSave(
          current,
          error,
          "Could not update database settings."
        )
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update database settings."
      );
      throw error;
    }
  }, [canEdit, draft, onSubmitPatch, onUpdated, pendingPatch]);

  const handleUpdate = useCallback(() => {
    saveSettingsDraft().catch(() => {
      /* Keep the user on the settings draft; panel state already shows failure. */
    });
  }, [saveSettingsDraft]);

  const handleReloadDraft = useCallback(() => {
    applySettingsDraftBackingResult(
      reloadSettingsDraftBackingState(backingState),
      {
        draft: setDraft,
        state: setBackingState,
      }
    );
  }, [backingState]);

  const handleKeepEditingDraft = useCallback(() => {
    setBackingState((current) => keepEditingSettingsDraftBackingState(current));
  }, []);

  useEffect(() => {
    if (!canEdit || onSettingsLeaveGuardChange == null) {
      return;
    }

    onSettingsLeaveGuardChange(
      dirty
        ? {
            canSave: canUpdate,
            dirty: true,
            discard: handleReloadDraft,
            save: saveSettingsDraft,
            scope: "database",
          }
        : null
    );

    return () => {
      onSettingsLeaveGuardChange(null);
    };
  }, [
    canEdit,
    canUpdate,
    dirty,
    handleReloadDraft,
    onSettingsLeaveGuardChange,
    saveSettingsDraft,
  ]);

  return (
    <CanvasResourcePane
      closeAriaLabel="Close database settings"
      icon={<DatabaseSettingsHeaderIcon iconUrl={data.states.iconUrl} />}
      onClose={onClose}
      subtitle={subtitle}
      title={data.states.name}
    >
      <DatabaseSettingsSection icon={Settings2} title="Replicas & Resources">
        <DatabaseSettingsSlider
          ariaLabel="Database replica count"
          constraint={DB_SETTINGS_REPLICA_COUNT}
          disabled={controlsDisabled}
          formatValue={formatReplicasValue}
          label="Number of Replicas"
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
          formatValue={formatCpuValue}
          icon={Cpu}
          label="CPU"
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
          formatBound={formatGiValue}
          formatValue={formatGiValue}
          icon={MemoryStick}
          label="Memory"
          maxDecimals={1}
          onValueChange={(value) => {
            setDraft((current) => ({
              ...current,
              memoryLimitGi: normalizeDbSettingsMemoryLimitGi(value),
            }));
          }}
          value={draft.memoryLimitGi}
        />
      </DatabaseSettingsSection>

      <DatabaseSettingsSection icon={HardDrive} title="Storage">
        <DatabaseSettingsSlider
          ariaLabel="Database storage size in Gi"
          constraint={DB_SETTINGS_STORAGE_GIB}
          disabled={controlsDisabled}
          formatBound={formatGiValue}
          formatValue={formatGiValue}
          icon={HardDrive}
          label="Storage"
          maxDecimals={0}
          onValueChange={(value) => {
            setDraft((current) => ({
              ...current,
              storageSizeGi: normalizeDbSettingsStorageGi(value),
            }));
          }}
          value={draft.storageSizeGi}
        />
      </DatabaseSettingsSection>

      <DatabaseSettingsSection icon={Network} title="Connection Address">
        <DatabaseSettingsConnectionAddressList
          connections={data.connections}
          controlsDisabled={controlsDisabled}
          onPublicConnectionChange={(nextEnabled) => {
            setDraft((current) => ({
              ...current,
              exposeNodePort: nextEnabled,
            }));
          }}
          publicConnectionEnabled={draft.exposeNodePort}
        />
      </DatabaseSettingsSection>

      {readOnly ? null : (
        <DatabaseSettingsFooter
          backingResourceChanged={backingState.resourceChanged}
          canUpdate={canUpdate}
          dirty={dirty}
          onKeepEditing={handleKeepEditingDraft}
          onReload={handleReloadDraft}
          onUpdate={handleUpdate}
          saveFailureMessage={backingState.saveFailureMessage}
          updating={updating}
        />
      )}
    </CanvasResourcePane>
  );
}
