"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  PortsTable,
  type PortRow as PortsTableDisplayRow,
} from "@workspace/ui/components/ports-table/ports-table";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  addContainerEnvDbDsnReferenceRow,
  addContainerEnvRow,
  type ContainerEnvDbDsnFieldOption,
  type ContainerEnvDbDsnReferenceTarget,
  type ContainerEnvDbDsnSource,
  type ContainerEnvDbReferenceField,
  type ContainerEnvRow,
  containerEnvDbDsnFieldOptions,
  containerEnvDbReferenceRowPatch,
  containerEnvRowsEqual,
  deleteContainerEnvRow,
  normalizeContainerEnvRowsForSave,
  updateContainerEnvRow,
  validateContainerEnvRows,
} from "@workspace/ui/lib/container-env-rows";
import { cn } from "@workspace/ui/lib/utils";
import {
  Cpu,
  Layers,
  MemoryStick,
  Plus,
  Save,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const CPU_QUOTA_DIRTY_EPS = 1e-9;

function resourceQuotasDirty(
  draftCpu: number,
  draftMem: number,
  committedCpu: number,
  committedMem: number,
  replicas?: { committed: number; draft: number }
): boolean {
  const cpuMemDirty =
    Math.abs(draftCpu - committedCpu) > CPU_QUOTA_DIRTY_EPS ||
    Math.round(draftMem) !== Math.round(committedMem);
  if (replicas == null) {
    return cpuMemDirty;
  }
  return (
    cpuMemDirty || Math.round(replicas.draft) !== Math.round(replicas.committed)
  );
}

/** Quota sliders are controlled: parent owns `value` and receives `onValueChange`. */
export interface ContainerSettingsControlledQuotaProps {
  disabled?: boolean;
  max?: number;
  min?: number;
  onValueChange: (value: number) => void;
  /** Radix Slider step (`ScaleSlider.Root` defaults to `0.1` unless set). */
  step?: number;
  value: number;
}

/** @deprecated Prefer {@link ContainerSettingsControlledQuotaProps}; pane quotas are always controlled. */
export type ContainerSettingsQuotaSliderProps =
  ContainerSettingsControlledQuotaProps;

export interface ContainerEnvVar extends ContainerEnvRow {}

export interface ContainerPort {
  /** Optional ingress or public host (Public address column when no explicit publicAddress URL). */
  host?: string;
  port: number;
  /**
   * Full internal URL (e.g. from AP `status.endpoints[].privateAddress`).
   * When set, overrides the default `0.0.0.0:{port}` in the Private address column.
   */
  privateAddress?: string;
  protocol: string;
  /**
   * Full public URL (e.g. from AP `status.endpoints[].publicAddress`).
   * When set, overrides host / protocol for the Public address column.
   */
  publicAddress?: string;
}

export interface ContainerSettingsPaneAddDbDsnReferenceIntent {
  dbName: string;
  dbNamespace: string;
  id: string;
}

export interface ContainerSettingsPaneConfirmedAddDbDsnReference {
  dbName: string;
  dbNamespace: string;
  id: string;
}

export interface ContainerSettingsPaneEnvChangeMeta {
  confirmedAddDbDsnReferences: ContainerSettingsPaneConfirmedAddDbDsnReference[];
}

export interface ContainerSettingsPaneProps {
  /**
   * One-shot request from a Canvas Connecting Edge to append an Add Reference row
   * with the dragged DB preselected.
   */
  addDbDsnReferenceIntent?: ContainerSettingsPaneAddDbDsnReferenceIntent | null;
  className?: string;
  cpuQuota: ContainerSettingsControlledQuotaProps;
  /** Project DB connection strings that can be saved into AP env values as DSN references. */
  dbDsnReferenceSources?: ContainerEnvDbDsnSource[];
  /** Environment variables shown and edited as structured rows. */
  env: ContainerEnvVar[];
  /** Full image reference (repository + tag/digest). */
  image: string;
  memoryQuota: ContainerSettingsControlledQuotaProps;
  onAddDbDsnReferenceIntentConsumed?: (id: string) => void;
  onEnvChange: (
    env: ContainerEnvVar[],
    meta?: ContainerSettingsPaneEnvChangeMeta
  ) => void;
  onImageChange: (image: string) => void;
  onPortsChange: (ports: ContainerPort[]) => void;
  /**
   * When set (and not `readOnly`), CPU/memory/replicas sliders keep local drafts until Save; Cancel reverts.
   * Omit for live slider updates via `cpuQuota` / `memoryQuota` / `replicasQuota` `onValueChange`.
   * When `replicasQuota` is set, `replicas` is included on Save.
   */
  onResourceQuotasCommit?: (next: {
    cpu: number;
    memory: number;
    replicas?: number;
  }) => void | Promise<void>;
  /** Exposed container ports + protocol labels. */
  ports: ContainerPort[];
  /**
   * When true, image/env/ports are view-only and quota sliders do not send updates.
   * Host may pass no-op callbacks.
   */
  readOnly?: boolean;
  /**
   * Deployment replica count (AP `spec.replicas`). Omit to hide the control (e.g. DB workloads).
   */
  replicasQuota?: ContainerSettingsControlledQuotaProps;
}

interface AddDbDsnReferenceIntentDraftMetadata {
  canvasAddDbDsnReferenceIntentId?: string;
}

type EnvDraftRow = ContainerEnvVar & AddDbDsnReferenceIntentDraftMetadata;

function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-medium text-foreground text-sm",
        className ?? "leading-snug"
      )}
    >
      {children}
    </h3>
  );
}

function containerPortsToTableRows(
  list: ContainerPort[]
): PortsTableDisplayRow[] {
  return list.map((entry) => {
    const publicAddressExplicit =
      entry.publicAddress != null && entry.publicAddress !== "";
    const privateAddressExplicit =
      entry.privateAddress != null && entry.privateAddress !== "";

    let publicAddress: string;
    if (publicAddressExplicit) {
      publicAddress = entry.publicAddress ?? "";
    } else if (entry.host != null && entry.host !== "") {
      publicAddress = entry.host;
    } else {
      publicAddress = entry.protocol.toUpperCase();
    }

    return {
      number: entry.port,
      privateAddress: privateAddressExplicit
        ? (entry.privateAddress ?? "")
        : `0.0.0.0:${entry.port}`,
      publicAddress,
    };
  });
}

const DB_REFERENCE_FIELD_LABELS: Record<ContainerEnvDbReferenceField, string> =
  {
    host: "Host",
    password: "Password",
    port: "Port",
    private: "Private DSN",
    public: "Public DSN",
    username: "Username",
  };

function envDbDsnFieldLabel(field: ContainerEnvDbReferenceField): string {
  return DB_REFERENCE_FIELD_LABELS[field];
}

function envRowDisplayValue(row: ContainerEnvVar): string {
  if (row.valueSource === "dbDsn" && row.dbDsn != null) {
    return `${row.dbDsn.dbName} ${envDbDsnFieldLabel(row.dbDsn.field)}`;
  }
  return row.valueSource === "valueFrom" ? "External reference" : row.value;
}

function envRowKey(row: ContainerEnvVar, index: number): string {
  return [
    index,
    row.name,
    row.value,
    row.valueSource ?? "direct",
    row.valueFrom == null ? "" : JSON.stringify(row.valueFrom),
  ].join("\u0000");
}

function nextEnvDraftKey(prefix: string, counter: { current: number }): string {
  const key = `${prefix}-${counter.current}`;
  counter.current += 1;
  return key;
}

function createEnvDraftKeys(
  count: number,
  prefix: string,
  counter: { current: number }
): string[] {
  return Array.from({ length: count }, () => nextEnvDraftKey(prefix, counter));
}

function ExternalEnvBadge({ className }: { className?: string }) {
  return (
    <Badge className={className} variant="outline">
      External
    </Badge>
  );
}

function ReferenceEnvBadge({ className }: { className?: string }) {
  return (
    <Badge className={className} variant="outline">
      Reference
    </Badge>
  );
}

function dbDsnSourceKey(source: ContainerEnvDbDsnSource): string {
  return `${source.namespace}/${source.name}`;
}

function dbDsnRowKey(row: ContainerEnvRow): string {
  if (row.dbDsn == null) {
    return "";
  }
  return `${row.dbDsn.dbNamespace}/${row.dbDsn.dbName}`;
}

function sourceFromDbDsnRow(
  row: ContainerEnvRow,
  sources: readonly ContainerEnvDbDsnSource[]
): ContainerEnvDbDsnSource | undefined {
  const key = dbDsnRowKey(row);
  return sources.find((source) => dbDsnSourceKey(source) === key);
}

function dbDsnSourceHasFields(source: ContainerEnvDbDsnSource): boolean {
  return containerEnvDbDsnFieldOptions(source).length > 0;
}

function dbDsnSourceMatchesTarget(
  source: ContainerEnvDbDsnSource,
  target: ContainerEnvDbDsnReferenceTarget
): boolean {
  return source.name === target.name && source.namespace === target.namespace;
}

function addDbDsnReferenceIntentTarget(
  intent: ContainerSettingsPaneAddDbDsnReferenceIntent
): ContainerEnvDbDsnReferenceTarget {
  return { name: intent.dbName, namespace: intent.dbNamespace };
}

function dbDsnSourceFromAddReferenceIntent(
  sources: readonly ContainerEnvDbDsnSource[],
  intent: ContainerSettingsPaneAddDbDsnReferenceIntent | null | undefined
): ContainerEnvDbDsnSource | undefined {
  if (intent == null) {
    return undefined;
  }
  const target = addDbDsnReferenceIntentTarget(intent);
  return sources.find(
    (source) =>
      dbDsnSourceMatchesTarget(source, target) && dbDsnSourceHasFields(source)
  );
}

function appendDbDsnReferenceIntentRow(
  rows: readonly ContainerEnvVar[],
  source: ContainerEnvDbDsnSource,
  intent: ContainerSettingsPaneAddDbDsnReferenceIntent
): EnvDraftRow[] {
  const target = addDbDsnReferenceIntentTarget(intent);
  const nextRows = addContainerEnvDbDsnReferenceRow(rows, [source], target);
  if (nextRows.length <= rows.length) {
    return [...nextRows];
  }
  return nextRows.map((row, index) =>
    index === nextRows.length - 1
      ? { ...row, canvasAddDbDsnReferenceIntentId: intent.id }
      : row
  );
}

function envDraftWithAddReferenceIntent({
  intent,
  readOnly,
  rows,
  sources,
}: {
  intent: ContainerSettingsPaneAddDbDsnReferenceIntent | null | undefined;
  readOnly: boolean;
  rows: readonly ContainerEnvVar[];
  sources: readonly ContainerEnvDbDsnSource[];
}): {
  consumedIntentId?: string;
  rows: EnvDraftRow[];
} {
  if (intent == null) {
    return { rows: [...rows] };
  }
  if (readOnly) {
    return { rows: [...rows] };
  }
  const source = dbDsnSourceFromAddReferenceIntent(sources, intent);
  if (source === undefined) {
    return { consumedIntentId: intent.id, rows: [...rows] };
  }
  return {
    consumedIntentId: intent.id,
    rows: appendDbDsnReferenceIntentRow(rows, source, intent),
  };
}

export function confirmedAddDbDsnReferencesFromEnvDraft(
  rows: readonly ContainerEnvVar[]
): ContainerSettingsPaneConfirmedAddDbDsnReference[] {
  const byIntentId = new Map<
    string,
    ContainerSettingsPaneConfirmedAddDbDsnReference
  >();

  for (const row of rows) {
    const intentId = (row as EnvDraftRow).canvasAddDbDsnReferenceIntentId;
    if (intentId == null || intentId === "" || row.dbDsn == null) {
      continue;
    }
    byIntentId.set(intentId, {
      dbName: row.dbDsn.dbName,
      dbNamespace: row.dbDsn.dbNamespace,
      id: intentId,
    });
  }

  return Array.from(byIntentId.values());
}

const envReferenceSelectClassName =
  "h-8 min-w-0 rounded-md border border-input bg-background px-2 font-mono text-foreground text-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

function ReadOnlyEnvRows({ env }: { env: readonly ContainerEnvVar[] }) {
  return (
    <div
      className="flex max-h-56 min-h-24 w-full flex-col gap-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-2"
      data-slot="container-env-rows"
    >
      {env.length === 0 ? (
        <span className="text-muted-foreground text-sm italic">
          No variables
        </span>
      ) : (
        env.map((row, index) => (
          <div
            className="grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 rounded-md border border-border bg-background/50 px-2.5 py-2"
            key={envRowKey(row, index)}
          >
            <span className="min-w-0 truncate font-mono text-foreground text-xs">
              {row.name}
            </span>
            <span className="min-w-0 truncate font-mono text-foreground text-xs">
              {envRowDisplayValue(row)}
              {row.valueSource === "valueFrom" ? (
                <ExternalEnvBadge className="ml-2 align-middle" />
              ) : null}
              {row.valueSource === "dbDsn" ? (
                <ReferenceEnvBadge className="ml-2 align-middle" />
              ) : null}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

interface EditableEnvRowsProps {
  dbDsnReferenceSources: ContainerEnvDbDsnSource[];
  envDirty: boolean;
  envDraft: ContainerEnvVar[];
  envErrorsByIndex: ReadonlyMap<number, string>;
  envRowKeys: readonly string[];
  envValidation: ReturnType<typeof validateContainerEnvRows>;
  onDeleteRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<ContainerEnvRow>) => void;
}

interface EditableEnvValueControlProps {
  dbDsnReferenceSources: ContainerEnvDbDsnSource[];
  index: number;
  onUpdateRow: (index: number, patch: Partial<ContainerEnvRow>) => void;
  row: ContainerEnvVar;
}

function EditableEnvValueControl({
  dbDsnReferenceSources,
  index,
  onUpdateRow,
  row,
}: EditableEnvValueControlProps) {
  if (row.valueSource === "valueFrom") {
    return (
      <div className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-input bg-muted/40 px-2.5 text-foreground text-xs">
        <span className="min-w-0 truncate font-mono">External reference</span>
        <ExternalEnvBadge className="shrink-0" />
      </div>
    );
  }

  if (row.valueSource === "dbDsn" && row.dbDsn != null) {
    const selectedSource = sourceFromDbDsnRow(row, dbDsnReferenceSources);
    const selectedFields = containerEnvDbDsnFieldOptions(selectedSource);
    const updateReference = (
      source: ContainerEnvDbDsnSource | undefined,
      field: ContainerEnvDbDsnFieldOption | undefined
    ) => {
      if (source === undefined || field === undefined) {
        return;
      }
      onUpdateRow(index, containerEnvDbReferenceRowPatch(source, field));
    };

    return (
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] gap-2">
        <select
          aria-label="Project DB"
          className={envReferenceSelectClassName}
          onChange={(event) => {
            const source = dbDsnReferenceSources.find(
              (item) => dbDsnSourceKey(item) === event.target.value
            );
            updateReference(source, containerEnvDbDsnFieldOptions(source)[0]);
          }}
          value={dbDsnRowKey(row)}
        >
          {dbDsnReferenceSources.map((source) => {
            const hasFields = dbDsnSourceHasFields(source);
            return (
              <option
                disabled={!hasFields}
                key={dbDsnSourceKey(source)}
                value={dbDsnSourceKey(source)}
              >
                {hasFields ? source.name : `${source.name} (unavailable)`}
              </option>
            );
          })}
        </select>
        <select
          aria-label="Project DB field"
          className={envReferenceSelectClassName}
          disabled={selectedFields.length === 0}
          onChange={(event) => {
            const field = selectedFields.find(
              (item) => item.field === event.target.value
            );
            updateReference(selectedSource, field);
          }}
          value={row.dbDsn.field}
        >
          {selectedFields.length === 0 ? (
            <option value="">No fields available</option>
          ) : null}
          {selectedFields.map((field) => (
            <option key={field.field} value={field.field}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <Input
      aria-label="Environment variable value"
      className="h-8 font-mono text-xs"
      onChange={(event) =>
        onUpdateRow(index, {
          value: event.target.value,
          valueSource: "direct",
        })
      }
      value={row.value}
    />
  );
}

function EditableEnvRows({
  dbDsnReferenceSources,
  envDirty,
  envDraft,
  envErrorsByIndex,
  envRowKeys,
  envValidation,
  onDeleteRow,
  onUpdateRow,
}: EditableEnvRowsProps) {
  return (
    <div
      className="flex max-h-72 min-h-24 w-full flex-col gap-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2"
      data-slot="container-env-rows"
    >
      {envDraft.length === 0 ? (
        <div className="flex min-h-16 items-center text-muted-foreground text-sm italic">
          No variables
        </div>
      ) : (
        envDraft.map((row, index) => {
          const error = envErrorsByIndex.get(index);
          const rowKey = envRowKeys[index] ?? envRowKey(row, index);
          return (
            <div className="grid min-w-0 gap-1.5" key={rowKey}>
              <div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto] gap-2">
                <Input
                  aria-invalid={error != null}
                  aria-label="Environment variable name"
                  className="h-8 font-mono text-xs"
                  onChange={(event) =>
                    onUpdateRow(index, {
                      name: event.target.value,
                    })
                  }
                  value={row.name}
                />
                <EditableEnvValueControl
                  dbDsnReferenceSources={dbDsnReferenceSources}
                  index={index}
                  onUpdateRow={onUpdateRow}
                  row={row}
                />
                <Button
                  aria-label="Remove environment variable"
                  onClick={() => onDeleteRow(index)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              {error == null ? null : (
                <p className="text-destructive text-xs" role="status">
                  {error}
                </p>
              )}
            </div>
          );
        })
      )}
      {!envValidation.valid && envDirty ? (
        <p className="text-destructive text-xs" role="status">
          Fix environment variable names before saving.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Structured readout for workload settings: container image, CPU/memory quota sliders,
 * optional replica count, environment variables, and exposed ports (`PortsTable`).
 * All fields are controlled by the host.
 */
export function ContainerSettingsPane({
  addDbDsnReferenceIntent,
  className,
  image,
  onImageChange,
  onEnvChange,
  onAddDbDsnReferenceIntentConsumed,
  onPortsChange,
  cpuQuota,
  memoryQuota,
  env,
  ports,
  replicasQuota,
  onResourceQuotasCommit,
  readOnly = false,
  dbDsnReferenceSources = [],
}: ContainerSettingsPaneProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDraft, setImageDraft] = useState(image);
  const [quotaSavePending, setQuotaSavePending] = useState(false);
  const inputId = useId();
  const envDraftKeyPrefix = useId();
  const envDraftKeyCounter = useRef(0);
  const initialEnvDraft = useMemo(
    () =>
      envDraftWithAddReferenceIntent({
        intent: addDbDsnReferenceIntent,
        readOnly,
        rows: env,
        sources: dbDsnReferenceSources,
      }),
    [addDbDsnReferenceIntent, dbDsnReferenceSources, env, readOnly]
  );
  const processedAddDbDsnReferenceIntentId = useRef<string | null>(
    initialEnvDraft.consumedIntentId ?? null
  );
  const envDraftSyncMounted = useRef(false);
  const [envDraft, setEnvDraft] = useState<EnvDraftRow[]>(
    () => initialEnvDraft.rows
  );
  const [envDraftKeys, setEnvDraftKeys] = useState<string[]>(() =>
    createEnvDraftKeys(
      initialEnvDraft.rows.length,
      envDraftKeyPrefix,
      envDraftKeyCounter
    )
  );

  const quotaCommitMode = onResourceQuotasCommit != null && readOnly !== true;

  const [draftCpu, setDraftCpu] = useState(cpuQuota.value);
  const [draftMem, setDraftMem] = useState(memoryQuota.value);
  const [draftReplicas, setDraftReplicas] = useState(
    () => replicasQuota?.value ?? 1
  );

  useEffect(() => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    if (replicasQuota == null) {
      return;
    }
    setDraftReplicas(replicasQuota.value);
  }, [cpuQuota.value, memoryQuota.value, replicasQuota]);

  useEffect(() => {
    if (!envDraftSyncMounted.current) {
      envDraftSyncMounted.current = true;
      return;
    }
    setEnvDraft(env);
    setEnvDraftKeys(
      createEnvDraftKeys(env.length, envDraftKeyPrefix, envDraftKeyCounter)
    );
  }, [env, envDraftKeyPrefix]);

  useEffect(() => {
    const intent = addDbDsnReferenceIntent;
    if (intent == null || readOnly) {
      return;
    }
    if (processedAddDbDsnReferenceIntentId.current === intent.id) {
      onAddDbDsnReferenceIntentConsumed?.(intent.id);
      return;
    }

    const source = dbDsnSourceFromAddReferenceIntent(
      dbDsnReferenceSources,
      intent
    );
    processedAddDbDsnReferenceIntentId.current = intent.id;
    onAddDbDsnReferenceIntentConsumed?.(intent.id);
    if (source === undefined) {
      return;
    }

    setEnvDraft((rows) => appendDbDsnReferenceIntentRow(rows, source, intent));
    setEnvDraftKeys((keys) => [
      ...keys,
      nextEnvDraftKey(envDraftKeyPrefix, envDraftKeyCounter),
    ]);
  }, [
    addDbDsnReferenceIntent,
    dbDsnReferenceSources,
    envDraftKeyPrefix,
    onAddDbDsnReferenceIntentConsumed,
    readOnly,
  ]);

  const quotasDirty = resourceQuotasDirty(
    draftCpu,
    draftMem,
    cpuQuota.value,
    memoryQuota.value,
    replicasQuota == null
      ? undefined
      : { committed: replicasQuota.value, draft: draftReplicas }
  );

  const handleQuotaCancel = () => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    if (replicasQuota == null) {
      return;
    }
    setDraftReplicas(replicasQuota.value);
  };

  const handleQuotaSave = async () => {
    if (onResourceQuotasCommit == null) {
      return;
    }
    setQuotaSavePending(true);
    try {
      await onResourceQuotasCommit({
        cpu: draftCpu,
        memory: draftMem,
        ...(replicasQuota == null ? {} : { replicas: draftReplicas }),
      });
    } finally {
      setQuotaSavePending(false);
    }
  };

  const portsTableRows = useMemo(
    () => containerPortsToTableRows(ports),
    [ports]
  );

  const envValidation = useMemo(
    () => validateContainerEnvRows(envDraft),
    [envDraft]
  );
  const envErrorsByIndex = useMemo(() => {
    const byIndex = new Map<number, string>();
    for (const error of envValidation.errors) {
      if (!byIndex.has(error.index)) {
        byIndex.set(error.index, error.message);
      }
    }
    return byIndex;
  }, [envValidation]);
  const envDirty = !containerEnvRowsEqual(envDraft, env);
  const canSaveEnv = envDirty && envValidation.valid;

  const cpuSlider = useMemo(() => {
    const base = {
      min: 0.25,
      max: 16,
      step: 0.25,
      ...cpuQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftCpu,
        value: draftCpu,
      };
    }
    return base;
  }, [cpuQuota, draftCpu, quotaCommitMode, readOnly]);

  const memorySlider = useMemo(() => {
    const base = {
      min: 512,
      max: 8192,
      step: 128,
      ...memoryQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftMem,
        value: draftMem,
      };
    }
    return base;
  }, [draftMem, memoryQuota, quotaCommitMode, readOnly]);

  const replicasSlider = useMemo(() => {
    if (replicasQuota == null) {
      return null;
    }
    const base = {
      min: 1,
      max: 20,
      step: 1,
      ...replicasQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftReplicas,
        value: draftReplicas,
      };
    }
    return base;
  }, [draftReplicas, quotaCommitMode, readOnly, replicasQuota]);

  const replicasSliderParts = useMemo(() => {
    if (replicasSlider == null) {
      return null;
    }
    const {
      value: replicasValueRaw,
      onValueChange: onReplicasQuotaChange,
      ...rest
    } = replicasSlider;
    return {
      onReplicasQuotaChange,
      replicasValue: clampScale(
        replicasValueRaw,
        replicasSlider.min,
        replicasSlider.max
      ),
      rest,
    };
  }, [replicasSlider]);

  const {
    value: cpuValueRaw,
    onValueChange: onCpuQuotaChange,
    ...cpuSliderRest
  } = cpuSlider;
  const {
    value: memoryValueRaw,
    onValueChange: onMemoryQuotaChange,
    ...memorySliderRest
  } = memorySlider;

  const cpuDecimals = 2;
  const memoryDecimals = 0;
  const cpuValue = clampScale(cpuValueRaw, cpuSlider.min, cpuSlider.max);
  const memoryValue = clampScale(
    memoryValueRaw,
    memorySlider.min,
    memorySlider.max
  );

  const handleImageDialogChange = (open: boolean) => {
    setImageDialogOpen(open);
    if (open) {
      setImageDraft(image);
    }
  };

  const handleSaveImage = () => {
    onImageChange(imageDraft.trim());
    setImageDialogOpen(false);
  };

  const handleSaveEnvRows = () => {
    if (!canSaveEnv) {
      return;
    }
    const normalized = normalizeContainerEnvRowsForSave(envDraft);
    const confirmedAddDbDsnReferences =
      confirmedAddDbDsnReferencesFromEnvDraft(envDraft);
    onEnvChange(
      normalized,
      confirmedAddDbDsnReferences.length === 0
        ? undefined
        : { confirmedAddDbDsnReferences }
    );
    setEnvDraft(
      normalized.map((row, index) => {
        const intentId = envDraft[index]?.canvasAddDbDsnReferenceIntentId;
        return intentId == null
          ? row
          : { ...row, canvasAddDbDsnReferenceIntentId: intentId };
      })
    );
  };

  const handleCancelEnvRows = () => {
    setEnvDraft(env);
    setEnvDraftKeys(
      createEnvDraftKeys(env.length, envDraftKeyPrefix, envDraftKeyCounter)
    );
  };

  const handleAddEnvRow = () => {
    setEnvDraft((rows) => addContainerEnvRow(rows));
    setEnvDraftKeys((keys) => [
      ...keys,
      nextEnvDraftKey(envDraftKeyPrefix, envDraftKeyCounter),
    ]);
  };

  const canAddDbDsnReference = dbDsnReferenceSources.some(dbDsnSourceHasFields);

  const handleAddDbDsnReferenceRow = () => {
    setEnvDraft((rows) =>
      addContainerEnvDbDsnReferenceRow(rows, dbDsnReferenceSources)
    );
    setEnvDraftKeys((keys) => [
      ...keys,
      nextEnvDraftKey(envDraftKeyPrefix, envDraftKeyCounter),
    ]);
  };

  const handleDeleteEnvRow = (index: number) => {
    setEnvDraft((rows) => deleteContainerEnvRow(rows, index));
    setEnvDraftKeys((keys) => keys.filter((_, keyIndex) => keyIndex !== index));
  };

  const handleUpdateEnvRow = (
    index: number,
    patch: Partial<ContainerEnvRow>
  ) => {
    setEnvDraft((rows) => updateContainerEnvRow(rows, index, patch));
  };

  const portsTableMutationProps = {
    onAdd: (portNumber: number) =>
      onPortsChange([...ports, { port: portNumber, protocol: "tcp" }]),
    onDelete: (portNumber: number) =>
      onPortsChange(ports.filter((p) => p.port !== portNumber)),
    onUpdate: (previousPortNumber: number, nextPortNumber: number) =>
      onPortsChange(
        ports.map((p) =>
          p.port === previousPortNumber ? { ...p, port: nextPortNumber } : p
        )
      ),
  };

  return (
    <>
      <div
        className={cn(
          "flex w-full flex-col gap-5 text-muted-foreground",
          className
        )}
        data-slot="container-settings-pane"
      >
        <section className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SectionTitle>Image</SectionTitle>
          </div>
          {readOnly ? (
            <div
              className={cn(
                "flex min-w-0 items-start break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-foreground text-sm leading-snug"
              )}
            >
              {image}
            </div>
          ) : (
            <button
              aria-label="Edit container image"
              className={cn(
                "flex items-center justify-between gap-1.5 break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 text-left font-mono text-foreground text-sm leading-snug",
                "cursor-pointer transition-colors hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              )}
              onClick={() => handleImageDialogChange(true)}
              type="button"
            >
              {image}
              <SquarePen
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex h-6 min-w-0 items-center justify-between gap-2">
            <SectionTitle className="m-0 min-w-0 shrink leading-none">
              Resource quota
            </SectionTitle>
            {quotaCommitMode && quotasDirty ? (
              <div className="-mr-1 flex shrink-0 items-center gap-1">
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={quotaSavePending}
                  onClick={handleQuotaCancel}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={quotaSavePending}
                  onClick={async () => {
                    await handleQuotaSave();
                  }}
                  type="button"
                  variant="secondary"
                >
                  Save
                </Button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            <ScaleSlider.Root
              {...cpuSliderRest}
              maxDecimals={cpuDecimals}
              onValueChange={onCpuQuotaChange}
              value={cpuValue}
              valueDisplay="number"
            >
              <ScaleSlider.Stack className="w-full">
                <ScaleSlider.Header className="min-h-6">
                  <ScaleSlider.Group className="min-w-0 gap-2">
                    <ScaleSlider.Icon className="shrink-0" icon={Cpu} />
                    <ScaleSlider.Label className="text-foreground">
                      CPU (cores)
                    </ScaleSlider.Label>
                  </ScaleSlider.Group>
                  <div className="flex h-6 min-w-0 items-center justify-end">
                    <ScaleSlider.Value />
                  </div>
                </ScaleSlider.Header>
                <ScaleSlider.Control aria-label="CPU quota (cores)">
                  <ScaleSlider.Track>
                    <ScaleSlider.Range />
                  </ScaleSlider.Track>
                  <ScaleSlider.Thumb />
                </ScaleSlider.Control>
              </ScaleSlider.Stack>
            </ScaleSlider.Root>

            <ScaleSlider.Root
              {...memorySliderRest}
              maxDecimals={memoryDecimals}
              onValueChange={onMemoryQuotaChange}
              value={memoryValue}
              valueDisplay="number"
            >
              <ScaleSlider.Stack className="w-full">
                <ScaleSlider.Header className="min-h-6">
                  <ScaleSlider.Group className="min-w-0 gap-2">
                    <ScaleSlider.Icon className="shrink-0" icon={MemoryStick} />
                    <ScaleSlider.Label className="text-foreground">
                      Memory (MiB)
                    </ScaleSlider.Label>
                  </ScaleSlider.Group>
                  <div className="flex h-6 min-w-0 items-center justify-end">
                    <ScaleSlider.Value />
                  </div>
                </ScaleSlider.Header>
                <ScaleSlider.Control aria-label="Memory quota (MiB)">
                  <ScaleSlider.Track>
                    <ScaleSlider.Range />
                  </ScaleSlider.Track>
                  <ScaleSlider.Thumb />
                </ScaleSlider.Control>
              </ScaleSlider.Stack>
            </ScaleSlider.Root>

            {replicasSliderParts == null ? null : (
              <ScaleSlider.Root
                {...replicasSliderParts.rest}
                maxDecimals={0}
                onValueChange={replicasSliderParts.onReplicasQuotaChange}
                value={replicasSliderParts.replicasValue}
                valueDisplay="number"
              >
                <ScaleSlider.Stack className="w-full">
                  <ScaleSlider.Header className="min-h-6">
                    <ScaleSlider.Group className="min-w-0 gap-2">
                      <ScaleSlider.Icon className="shrink-0" icon={Layers} />
                      <ScaleSlider.Label className="text-foreground">
                        Replicas
                      </ScaleSlider.Label>
                    </ScaleSlider.Group>
                    <div className="flex h-6 min-w-0 items-center justify-end">
                      <ScaleSlider.Value />
                    </div>
                  </ScaleSlider.Header>
                  <ScaleSlider.Control aria-label="Replica count">
                    <ScaleSlider.Track>
                      <ScaleSlider.Range />
                    </ScaleSlider.Track>
                    <ScaleSlider.Thumb />
                  </ScaleSlider.Control>
                </ScaleSlider.Stack>
              </ScaleSlider.Root>
            )}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SectionTitle>Environment</SectionTitle>
            {readOnly ? null : (
              <div className="flex shrink-0 items-center gap-1">
                {envDirty ? (
                  <>
                    <Button
                      aria-label="Cancel environment changes"
                      onClick={handleCancelEnvRows}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden data-icon="inline-start" />
                      Cancel
                    </Button>
                    <Button
                      disabled={!canSaveEnv}
                      onClick={handleSaveEnvRows}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Save aria-hidden data-icon="inline-start" />
                      Save environment
                    </Button>
                  </>
                ) : null}
                <Button
                  aria-label="Add environment variable"
                  onClick={handleAddEnvRow}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden data-icon="inline-start" />
                  Add
                </Button>
                {canAddDbDsnReference ? (
                  <Button
                    aria-label="Add Project DB reference"
                    onClick={handleAddDbDsnReferenceRow}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus aria-hidden data-icon="inline-start" />
                    Add Reference
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          {readOnly ? (
            <ReadOnlyEnvRows env={env} />
          ) : (
            <EditableEnvRows
              dbDsnReferenceSources={dbDsnReferenceSources}
              envDirty={envDirty}
              envDraft={envDraft}
              envErrorsByIndex={envErrorsByIndex}
              envRowKeys={envDraftKeys}
              envValidation={envValidation}
              onDeleteRow={handleDeleteEnvRow}
              onUpdateRow={handleUpdateEnvRow}
            />
          )}
        </section>

        <Separator />

        <section className="flex min-w-0 flex-col gap-2">
          <PortsTable.Variant0
            ports={portsTableRows}
            {...(readOnly
              ? {}
              : {
                  onAdd: portsTableMutationProps.onAdd,
                  onDelete: portsTableMutationProps.onDelete,
                  onUpdate: portsTableMutationProps.onUpdate,
                })}
          />
        </section>
      </div>

      {readOnly ? null : (
        <Dialog onOpenChange={handleImageDialogChange} open={imageDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Container image</DialogTitle>
              <DialogDescription>
                Registry path, tag, or digest for this workload.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor={inputId}>Image reference</Label>
              <Textarea
                className="min-h-24 font-mono text-sm"
                id={inputId}
                onChange={(e) => setImageDraft(e.target.value)}
                placeholder="e.g. ghcr.io/org/app:1.0.0"
                value={imageDraft}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => handleImageDialogChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveImage} type="button">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
