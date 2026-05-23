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
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
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
  containerEnvRowsModelEqual,
  deleteContainerEnvRow,
  normalizeContainerEnvRowsForSave,
  updateContainerEnvRow,
  validateContainerEnvRows,
} from "@workspace/ui/lib/container-env-rows";
import { cn } from "@workspace/ui/lib/utils";
import {
  Copy,
  Cpu,
  Layers,
  type LucideIcon,
  MemoryStick,
  Plus,
  Save,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { parsePortNumberDigits } from "../ports-table/ports-table.helpers";

const CPU_QUOTA_DIRTY_EPS = 1e-9;
const REPLICA_LIMITS = { max: 20, min: 1 } as const;
const CPU_UTILIZATION_TARGET_LIMITS = { max: 100, min: 1 } as const;
const MEMORY_AVERAGE_TARGET_LIMITS = { max: 8192, min: 128 } as const;
const DEFAULT_CPU_UTILIZATION_TARGET_PERCENT = 80;
const DEFAULT_MEMORY_AVERAGE_TARGET_MIB = 512;
const MEMORY_AVERAGE_VALUE_RE = /^([1-9][0-9]*)(Mi|Gi)$/;

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
  /** Retained for non-AP callers; AP settings use `network` instead. */
  host?: string;
  port: number;
  /** Retained for non-AP callers; AP settings use `network.privateAddress` instead. */
  privateAddress?: string;
  protocol: string;
  /** Retained for non-AP callers; AP settings use `network.publicAddresses` instead. */
  publicAddress?: string;
}

export interface ContainerNetworkPublicAddress {
  host?: string;
  id?: string;
  port: number;
  status?: string;
  type?: string;
  url?: string;
}

export interface ContainerNetwork {
  privateAddress?: string;
  privatePort: number;
  publicAddresses: ContainerNetworkPublicAddress[];
}

export interface ContainerFixedReplicaStrategy {
  elastic?: ContainerElasticReplicaSettings;
  fixed: {
    replicas: number;
  };
  type: "fixed";
}

export interface ContainerCpuElasticReplicaTarget {
  metric: "cpu";
  type: "utilization";
  utilizationPercent: number;
}

export interface ContainerMemoryElasticReplicaTarget {
  averageValue: string;
  metric: "memory";
  type: "averageValue";
}

export type ContainerElasticReplicaTarget =
  | ContainerCpuElasticReplicaTarget
  | ContainerMemoryElasticReplicaTarget;

export interface ContainerElasticReplicaSettings {
  maxReplicas: number;
  minReplicas: number;
  target: ContainerElasticReplicaTarget;
}

export interface ContainerElasticReplicaStrategy {
  elastic: ContainerElasticReplicaSettings;
  fixed: {
    replicas: number;
  };
  type: "elastic";
}

export type ContainerReplicaStrategy =
  | ContainerElasticReplicaStrategy
  | ContainerFixedReplicaStrategy;

type ReplicaStrategyType = ContainerReplicaStrategy["type"];
type ElasticTargetMetric = ContainerElasticReplicaTarget["metric"];

interface ResourceQuotasDirtyReplicaStrategy {
  committed: ContainerReplicaStrategy;
  draft: ContainerReplicaStrategy;
}

interface ResourceQuotaReplicaPatch {
  replicaStrategy?: ContainerReplicaStrategy;
  replicas?: number;
}

const DEFAULT_FIXED_REPLICAS: number = REPLICA_LIMITS.min;
const DEFAULT_ELASTIC_REPLICA_SETTINGS: ContainerElasticReplicaSettings = {
  maxReplicas: 10,
  minReplicas: REPLICA_LIMITS.min,
  target: {
    metric: "cpu",
    type: "utilization",
    utilizationPercent: DEFAULT_CPU_UTILIZATION_TARGET_PERCENT,
  },
};

function roundAndClamp(n: number, min: number, max: number): number {
  return clampScale(Math.round(n), min, max);
}

function normalizeReplicaCount(replicas: number): number {
  return roundAndClamp(replicas, REPLICA_LIMITS.min, REPLICA_LIMITS.max);
}

function normalizeCpuUtilizationTarget(utilizationPercent: number): number {
  return roundAndClamp(
    utilizationPercent,
    CPU_UTILIZATION_TARGET_LIMITS.min,
    CPU_UTILIZATION_TARGET_LIMITS.max
  );
}

function memoryAverageValueToMib(averageValue: string | undefined): number {
  const match = MEMORY_AVERAGE_VALUE_RE.exec(averageValue ?? "");
  if (match == null) {
    return DEFAULT_MEMORY_AVERAGE_TARGET_MIB;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return DEFAULT_MEMORY_AVERAGE_TARGET_MIB;
  }
  return match[2] === "Gi" ? value * 1024 : value;
}

function memoryAverageMibToValue(mib: number): string {
  return `${roundAndClamp(
    mib,
    MEMORY_AVERAGE_TARGET_LIMITS.min,
    MEMORY_AVERAGE_TARGET_LIMITS.max
  )}Mi`;
}

function normalizeMemoryAverageTarget(
  averageValue: string | undefined
): string {
  return memoryAverageMibToValue(memoryAverageValueToMib(averageValue));
}

function defaultCpuElasticTarget(): ContainerCpuElasticReplicaTarget {
  return {
    metric: "cpu",
    type: "utilization",
    utilizationPercent: DEFAULT_CPU_UTILIZATION_TARGET_PERCENT,
  };
}

function defaultMemoryElasticTarget(): ContainerMemoryElasticReplicaTarget {
  return {
    averageValue: `${DEFAULT_MEMORY_AVERAGE_TARGET_MIB}Mi`,
    metric: "memory",
    type: "averageValue",
  };
}

function normalizeElasticTarget(
  target: ContainerElasticReplicaSettings["target"] | undefined
): ContainerElasticReplicaTarget {
  if (target?.metric === "memory") {
    return {
      averageValue: normalizeMemoryAverageTarget(target.averageValue),
      metric: "memory",
      type: "averageValue",
    };
  }
  return {
    metric: "cpu",
    type: "utilization",
    utilizationPercent: normalizeCpuUtilizationTarget(
      target?.utilizationPercent ?? DEFAULT_CPU_UTILIZATION_TARGET_PERCENT
    ),
  };
}

function normalizeFixedReplicaSettings(replicas: number): { replicas: number } {
  return { replicas: normalizeReplicaCount(replicas) };
}

function normalizeElasticReplicaSettings(
  settings: ContainerElasticReplicaSettings | undefined
): ContainerElasticReplicaSettings {
  const minReplicas = normalizeReplicaCount(
    settings?.minReplicas ?? DEFAULT_ELASTIC_REPLICA_SETTINGS.minReplicas
  );
  const maxReplicas = Math.max(
    minReplicas,
    normalizeReplicaCount(
      settings?.maxReplicas ?? DEFAULT_ELASTIC_REPLICA_SETTINGS.maxReplicas
    )
  );
  return {
    maxReplicas,
    minReplicas,
    target: normalizeElasticTarget(settings?.target),
  };
}

function normalizeReplicaStrategy(
  strategy: ContainerReplicaStrategy | undefined,
  fixedReplicas = DEFAULT_FIXED_REPLICAS
): ContainerReplicaStrategy {
  const fixed = normalizeFixedReplicaSettings(
    strategy?.fixed.replicas ?? fixedReplicas
  );
  if (strategy?.type === "elastic") {
    return {
      elastic: normalizeElasticReplicaSettings(strategy.elastic),
      fixed,
      type: "elastic",
    };
  }
  return {
    ...(strategy?.elastic == null
      ? {}
      : { elastic: normalizeElasticReplicaSettings(strategy.elastic) }),
    fixed,
    type: "fixed",
  };
}

function elasticSettingsFromStrategy(
  strategy: ContainerReplicaStrategy
): ContainerElasticReplicaSettings {
  if (strategy.type === "elastic") {
    return strategy.elastic;
  }
  return strategy.elastic ?? DEFAULT_ELASTIC_REPLICA_SETTINGS;
}

function replicaStrategiesEqual(
  a: ContainerReplicaStrategy,
  b: ContainerReplicaStrategy
): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (Math.round(a.fixed.replicas) !== Math.round(b.fixed.replicas)) {
    return false;
  }
  const aElastic = elasticSettingsFromStrategy(a);
  const bElastic = elasticSettingsFromStrategy(b);
  return (
    Math.round(aElastic.minReplicas) === Math.round(bElastic.minReplicas) &&
    Math.round(aElastic.maxReplicas) === Math.round(bElastic.maxReplicas) &&
    elasticTargetsEqual(aElastic.target, bElastic.target)
  );
}

function elasticTargetsEqual(
  a: ContainerElasticReplicaTarget,
  b: ContainerElasticReplicaTarget
): boolean {
  if (a.metric !== b.metric) {
    return false;
  }
  if (a.metric === "memory" && b.metric === "memory") {
    return (
      normalizeMemoryAverageTarget(a.averageValue) ===
      normalizeMemoryAverageTarget(b.averageValue)
    );
  }
  if (a.metric === "cpu" && b.metric === "cpu") {
    return (
      Math.round(a.utilizationPercent) === Math.round(b.utilizationPercent)
    );
  }
  return false;
}

function replicaStrategyWithType(
  current: ContainerReplicaStrategy,
  type: ReplicaStrategyType
): ContainerReplicaStrategy {
  const elastic = normalizeElasticReplicaSettings(
    elasticSettingsFromStrategy(current)
  );
  const fixed = normalizeFixedReplicaSettings(current.fixed.replicas);
  if (type === "elastic") {
    return { elastic, fixed, type: "elastic" };
  }
  return { elastic, fixed, type: "fixed" };
}

function replicaPatchFromDraft(
  hasReplicasQuota: boolean,
  draftReplicaStrategy: ContainerReplicaStrategy
): ResourceQuotaReplicaPatch {
  if (!hasReplicasQuota) {
    return {};
  }
  if (draftReplicaStrategy.type === "fixed") {
    return { replicas: draftReplicaStrategy.fixed.replicas };
  }
  return { replicaStrategy: draftReplicaStrategy };
}

function resourceQuotasDirty(
  draftCpu: number,
  draftMem: number,
  committedCpu: number,
  committedMem: number,
  replicaStrategy?: ResourceQuotasDirtyReplicaStrategy
): boolean {
  const cpuMemDirty =
    Math.abs(draftCpu - committedCpu) > CPU_QUOTA_DIRTY_EPS ||
    Math.round(draftMem) !== Math.round(committedMem);
  if (replicaStrategy == null) {
    return cpuMemDirty;
  }
  return (
    cpuMemDirty ||
    !replicaStrategiesEqual(replicaStrategy.draft, replicaStrategy.committed)
  );
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
  /** AP network model rendered by the Network section. */
  network?: ContainerNetwork;
  onAddDbDsnReferenceIntentConsumed?: (id: string) => void;
  onEnvChange: (
    env: ContainerEnvVar[],
    meta?: ContainerSettingsPaneEnvChangeMeta
  ) => void;
  onImageChange: (image: string) => void;
  onNetworkChange?: (network: ContainerNetwork) => void | Promise<void>;
  onPortsChange: (ports: ContainerPort[]) => void;
  /**
   * When set (and not `readOnly`), CPU/memory/replicas sliders keep local drafts until Save; Cancel reverts.
   * Omit for live slider updates via `cpuQuota` / `memoryQuota` / `replicasQuota` `onValueChange`.
   * When `replicasQuota` is set, `replicas` is included on Save.
   */
  onResourceQuotasCommit?: (next: {
    cpu: number;
    memory: number;
    replicaStrategy?: ContainerReplicaStrategy;
    replicas?: number;
  }) => void | Promise<void>;
  /** Exposed container ports + protocol labels. */
  ports: ContainerPort[];
  /**
   * When true, image/env/ports are view-only and quota sliders do not send updates.
   * Host may pass no-op callbacks.
   */
  readOnly?: boolean;
  /** AP replica behavior rendered as a mutually exclusive strategy control. */
  replicaStrategy?: ContainerReplicaStrategy;
  /**
   * Fixed AP replica count. Omit to hide the control (e.g. DB workloads).
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

interface NetworkSettingsSectionProps {
  network: ContainerNetwork;
  onNetworkChange?: (network: ContainerNetwork) => void | Promise<void>;
  readOnly: boolean;
}

function publicAddressValue(address: ContainerNetworkPublicAddress): string {
  return address.url?.trim() || address.host?.trim() || "";
}

function publicAddressKey(
  address: ContainerNetworkPublicAddress,
  index: number
): string {
  return (
    address.id?.trim() ||
    address.host?.trim().toLowerCase() ||
    `pending-${index}`
  );
}

function isPublicAddressDeleteTarget(
  address: ContainerNetworkPublicAddress,
  index: number,
  target: ContainerNetworkPublicAddress | undefined,
  targetIndex: number
): boolean {
  const targetId = target?.id?.trim();
  if (targetId == null || targetId === "") {
    return index === targetIndex;
  }
  return address.id?.trim() === targetId;
}

interface PublicAddressRowProps {
  address: ContainerNetworkPublicAddress;
  onDelete?: () => void | Promise<void>;
  readOnly: boolean;
}

function PublicAddressRow({
  address,
  onDelete,
  readOnly,
}: PublicAddressRowProps) {
  const [pending, setPending] = useState(false);
  const value = publicAddressValue(address);

  const handleCopy = async () => {
    if (value === "") {
      return;
    }
    await navigator.clipboard?.writeText(value);
  };

  const handleDelete = async () => {
    if (onDelete == null) {
      return;
    }
    setPending(true);
    try {
      await onDelete();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-border bg-background/60 p-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 truncate font-mono text-foreground text-xs">
          {value}
        </div>
        {address.status == null || address.status === "" ? null : (
          <Badge className="shrink-0 text-[10px]" variant="secondary">
            {address.status}
          </Badge>
        )}
        <Button
          aria-label="Copy Public Address"
          disabled={value === ""}
          onClick={handleCopy}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden />
        </Button>
        {readOnly || onDelete == null ? null : (
          <Button
            aria-label="Delete Public Address"
            disabled={pending}
            onClick={handleDelete}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      <div className="grid min-w-0 gap-1.5">
        <Label>Public Address target port</Label>
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-8 max-w-32 rounded-md border border-border bg-muted/30 px-2.5 py-2 font-mono text-foreground text-xs">
            {address.port}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PublicAddressDraft {
  port: number;
}

type PublicAddressDraftValidation =
  | { address: PublicAddressDraft; ok: true }
  | { message: string; ok: false };

function validatePublicAddressDraft(
  portDraft: string
): PublicAddressDraftValidation {
  const parsedPort = parsePortNumberDigits(portDraft.trim());
  if (!parsedPort.ok) {
    return { message: parsedPort.message, ok: false };
  }

  return { address: { port: parsedPort.n }, ok: true };
}

interface AddPublicAddressFormProps {
  defaultPort: number;
  onCancel: () => void;
  onSubmit?: (address: PublicAddressDraft) => void | Promise<void>;
}

function AddPublicAddressForm({
  defaultPort,
  onCancel,
  onSubmit,
}: AddPublicAddressFormProps) {
  const portInputId = useId();
  const errorId = `${portInputId}-error`;
  const [draftPort, setDraftPort] = useState(() => String(defaultPort));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    if (onSubmit == null) {
      return;
    }
    const validation = validatePublicAddressDraft(draftPort);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setPending(true);
    try {
      await onSubmit(validation.address);
    } finally {
      setPending(false);
    }
    onCancel();
  };

  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-border border-dashed bg-background/60 p-2">
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={portInputId}>Public Address target port</Label>
        <Input
          aria-describedby={error == null ? undefined : errorId}
          aria-invalid={error != null}
          className="h-8 max-w-32 font-mono text-xs"
          disabled={pending}
          id={portInputId}
          inputMode="numeric"
          onChange={(event) => {
            setDraftPort(event.target.value);
            setError(null);
          }}
          value={draftPort}
        />
      </div>
      {error == null ? null : (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1">
        <Button
          className="h-7 px-2 text-xs"
          disabled={pending}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="h-7 px-2 text-xs"
          disabled={pending || onSubmit == null}
          onClick={handleSubmit}
          type="button"
          variant="secondary"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function NetworkSettingsSection({
  network,
  onNetworkChange,
  readOnly,
}: NetworkSettingsSectionProps) {
  const networkInputId = useId();
  const [draftPort, setDraftPort] = useState(() => String(network.privatePort));
  const [addOpen, setAddOpen] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const privateAddress = network.privateAddress ?? "";
  const hasPrivateAddress = privateAddress !== "";
  const canMutateNetwork = !readOnly && onNetworkChange != null;

  useEffect(() => {
    setDraftPort(String(network.privatePort));
    setPortError(null);
  }, [network.privatePort]);

  const parsedPort = parsePortNumberDigits(draftPort.trim());
  const portDirty = draftPort.trim() !== String(network.privatePort);
  const canSave =
    onNetworkChange != null && portDirty && parsedPort.ok && !savePending;

  const handleCancel = () => {
    setDraftPort(String(network.privatePort));
    setPortError(null);
  };

  const handleSave = async () => {
    if (onNetworkChange == null) {
      return;
    }
    const parsed = parsePortNumberDigits(draftPort.trim());
    if (!parsed.ok) {
      setPortError(parsed.message);
      return;
    }
    setSavePending(true);
    try {
      await onNetworkChange({ ...network, privatePort: parsed.n });
    } finally {
      setSavePending(false);
    }
  };

  const handleCopyPrivateAddress = async () => {
    if (!hasPrivateAddress) {
      return;
    }
    await navigator.clipboard?.writeText(privateAddress);
  };

  const handleCancelAddPublicAddress = () => {
    setAddOpen(false);
  };

  const handleAddPublicAddress = async (address: PublicAddressDraft) => {
    if (onNetworkChange == null) {
      return;
    }
    await onNetworkChange({
      ...network,
      publicAddresses: [...network.publicAddresses, address],
    });
  };

  const handleDeletePublicAddress = async (index: number) => {
    if (onNetworkChange == null) {
      return;
    }
    const target = network.publicAddresses[index];
    const publicAddresses = network.publicAddresses.filter(
      (address, itemIndex) =>
        !isPublicAddressDeleteTarget(address, itemIndex, target, index)
    );
    await onNetworkChange({ ...network, publicAddresses });
  };

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <SectionTitle>Network</SectionTitle>
        {readOnly || !portDirty ? null : (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              className="h-7 px-2 text-xs"
              disabled={savePending}
              onClick={handleCancel}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-7 px-2 text-xs"
              disabled={!canSave}
              onClick={async () => {
                await handleSave();
              }}
              type="button"
              variant="secondary"
            >
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/20 p-2.5">
        <div className="grid min-w-0 gap-1.5">
          <Label className="text-muted-foreground text-xs">
            Private Address
          </Label>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-background/60 px-2.5 py-2 font-mono text-foreground text-xs">
              {hasPrivateAddress ? privateAddress : "Pending"}
            </div>
            <Button
              aria-label="Copy Private Address"
              disabled={!hasPrivateAddress}
              onClick={handleCopyPrivateAddress}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Copy aria-hidden />
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={networkInputId}>Private Address target port</Label>
          <Input
            aria-describedby={
              portError == null ? undefined : `${networkInputId}-error`
            }
            aria-invalid={portError != null}
            className="h-8 max-w-32 font-mono text-xs"
            disabled={readOnly}
            id={networkInputId}
            inputMode="numeric"
            onChange={(event) => {
              setDraftPort(event.target.value);
              setPortError(null);
            }}
            value={draftPort}
          />
          {portError == null ? null : (
            <p
              className="text-destructive text-xs"
              id={`${networkInputId}-error`}
              role="alert"
            >
              {portError}
            </p>
          )}
        </div>

        <div className="grid min-w-0 gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Label className="text-muted-foreground text-xs">
              Public Addresses
            </Label>
            {readOnly ? null : (
              <Button
                aria-label="Add Public Address"
                className="h-7 px-2 text-xs"
                disabled={addOpen || onNetworkChange == null}
                onClick={() => setAddOpen(true)}
                type="button"
                variant="ghost"
              >
                <Plus aria-hidden />
                Add
              </Button>
            )}
          </div>
          {addOpen ? (
            <AddPublicAddressForm
              defaultPort={network.privatePort}
              onCancel={handleCancelAddPublicAddress}
              onSubmit={
                onNetworkChange == null ? undefined : handleAddPublicAddress
              }
            />
          ) : null}
          {network.publicAddresses.length === 0 ? (
            <div className="rounded-md border border-border border-dashed px-2.5 py-2 text-muted-foreground text-xs">
              No public addresses
            </div>
          ) : (
            <div className="grid gap-2">
              {network.publicAddresses.map((address, index) => (
                <PublicAddressRow
                  address={address}
                  key={publicAddressKey(address, index)}
                  onDelete={
                    canMutateNetwork
                      ? () => handleDeletePublicAddress(index)
                      : undefined
                  }
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface ReplicaStrategySectionProps {
  elastic: ContainerElasticReplicaSettings;
  fixedReplicasSliderParts: {
    onReplicasQuotaChange: (value: number) => void;
    replicasValue: number;
    rest: Omit<
      ContainerSettingsControlledQuotaProps,
      "onValueChange" | "value"
    >;
  };
  onElasticCpuTargetChange: (value: number) => void;
  onElasticMaxReplicasChange: (value: number) => void;
  onElasticMemoryTargetChange: (value: number) => void;
  onElasticMinReplicasChange: (value: number) => void;
  onElasticTargetMetricChange: (metric: ElasticTargetMetric) => void;
  onStrategyTypeChange: (type: ReplicaStrategyType) => void;
  readOnly: boolean;
  strategyType: ReplicaStrategyType;
}

interface ReplicaScaleSliderProps {
  "aria-label": string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  rest?: Omit<ContainerSettingsControlledQuotaProps, "onValueChange" | "value">;
  value: number;
}

function ReplicaScaleSlider({
  "aria-label": ariaLabel,
  disabled,
  icon,
  label,
  max,
  min,
  onValueChange,
  rest,
  value,
}: ReplicaScaleSliderProps) {
  return (
    <ScaleSlider.Root
      {...rest}
      disabled={disabled ?? rest?.disabled}
      max={max}
      maxDecimals={0}
      min={min}
      onValueChange={onValueChange}
      step={rest?.step ?? 1}
      value={value}
      valueDisplay="number"
    >
      <ScaleSlider.Stack className="w-full">
        <ScaleSlider.Header className="min-h-6">
          <ScaleSlider.Group className="min-w-0 gap-2">
            <ScaleSlider.Icon className="shrink-0" icon={icon} />
            <ScaleSlider.Label className="text-foreground">
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

function ReplicaStrategySection({
  elastic,
  fixedReplicasSliderParts,
  onElasticCpuTargetChange,
  onElasticMaxReplicasChange,
  onElasticMemoryTargetChange,
  onElasticMinReplicasChange,
  onElasticTargetMetricChange,
  onStrategyTypeChange,
  readOnly,
  strategyType,
}: ReplicaStrategySectionProps) {
  const minReplicas = normalizeReplicaCount(elastic.minReplicas);
  const maxReplicas = Math.max(
    minReplicas,
    normalizeReplicaCount(elastic.maxReplicas)
  );
  const targetMetric = elastic.target.metric;
  const cpuTarget =
    elastic.target.metric === "cpu"
      ? normalizeCpuUtilizationTarget(elastic.target.utilizationPercent)
      : DEFAULT_CPU_UTILIZATION_TARGET_PERCENT;
  const memoryTarget =
    elastic.target.metric === "memory"
      ? memoryAverageValueToMib(elastic.target.averageValue)
      : DEFAULT_MEMORY_AVERAGE_TARGET_MIB;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex h-6 min-w-0 items-center justify-between gap-2">
        <SectionTitle className="m-0 min-w-0 shrink leading-none">
          Replica Strategy
        </SectionTitle>
      </div>
      <div className="grid min-w-0 gap-3">
        <ToggleGroup
          aria-label="Replica Strategy"
          className="grid w-full grid-cols-2"
          onValueChange={(value) => {
            const next = value[0];
            if (next === "fixed" || next === "elastic") {
              onStrategyTypeChange(next);
            }
          }}
          spacing={1}
          value={[strategyType]}
          variant="outline"
        >
          <ToggleGroupItem
            aria-label="Fixed Replicas"
            className="h-8 min-w-0 text-xs data-[selected=true]:bg-muted"
            data-selected={strategyType === "fixed" ? "true" : undefined}
            disabled={readOnly}
            value="fixed"
          >
            Fixed Replicas
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Elastic Scaling"
            className="h-8 min-w-0 text-xs"
            data-selected={strategyType === "elastic" ? "true" : undefined}
            disabled={readOnly}
            value="elastic"
          >
            Elastic Scaling
          </ToggleGroupItem>
        </ToggleGroup>

        {strategyType === "fixed" ? (
          <ReplicaScaleSlider
            aria-label="Replica count"
            icon={Layers}
            label="Replica count"
            max={fixedReplicasSliderParts.rest.max ?? REPLICA_LIMITS.max}
            min={fixedReplicasSliderParts.rest.min ?? REPLICA_LIMITS.min}
            onValueChange={fixedReplicasSliderParts.onReplicasQuotaChange}
            rest={fixedReplicasSliderParts.rest}
            value={fixedReplicasSliderParts.replicasValue}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <ReplicaScaleSlider
              aria-label="Minimum replicas"
              disabled={readOnly}
              icon={Layers}
              label="Minimum replicas"
              max={REPLICA_LIMITS.max}
              min={REPLICA_LIMITS.min}
              onValueChange={onElasticMinReplicasChange}
              value={minReplicas}
            />

            <ReplicaScaleSlider
              aria-label="Maximum replicas"
              disabled={readOnly}
              icon={Layers}
              label="Maximum replicas"
              max={REPLICA_LIMITS.max}
              min={REPLICA_LIMITS.min}
              onValueChange={onElasticMaxReplicasChange}
              value={maxReplicas}
            />

            <div className="grid min-w-0 gap-2">
              <Label className="text-foreground text-xs">Scaling target</Label>
              <ToggleGroup
                aria-label="Scaling target"
                className="grid w-full grid-cols-2"
                onValueChange={(value) => {
                  const next = value[0];
                  if (next === "cpu" || next === "memory") {
                    onElasticTargetMetricChange(next);
                  }
                }}
                spacing={1}
                value={[targetMetric]}
                variant="outline"
              >
                <ToggleGroupItem
                  aria-label="CPU utilization target"
                  className="h-8 min-w-0 text-xs data-[selected=true]:bg-muted"
                  data-selected={targetMetric === "cpu" ? "true" : undefined}
                  disabled={readOnly}
                  value="cpu"
                >
                  CPU utilization target
                </ToggleGroupItem>
                <ToggleGroupItem
                  aria-label="Memory average target"
                  className="h-8 min-w-0 text-xs data-[selected=true]:bg-muted"
                  data-selected={targetMetric === "memory" ? "true" : undefined}
                  disabled={readOnly}
                  value="memory"
                >
                  Memory average target
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {targetMetric === "memory" ? (
              <ReplicaScaleSlider
                aria-label="Memory average target"
                disabled={readOnly}
                icon={MemoryStick}
                label="Memory average target"
                max={MEMORY_AVERAGE_TARGET_LIMITS.max}
                min={MEMORY_AVERAGE_TARGET_LIMITS.min}
                onValueChange={onElasticMemoryTargetChange}
                value={memoryTarget}
              />
            ) : (
              <ReplicaScaleSlider
                aria-label="CPU utilization target"
                disabled={readOnly}
                icon={Cpu}
                label="CPU utilization target"
                max={CPU_UTILIZATION_TARGET_LIMITS.max}
                min={CPU_UTILIZATION_TARGET_LIMITS.min}
                onValueChange={onElasticCpuTargetChange}
                value={cpuTarget}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Structured readout for workload settings: container image, CPU/memory quota sliders,
 * optional replica count, environment variables, and AP Network settings.
 * All fields are controlled by the host.
 */
export function ContainerSettingsPane({
  addDbDsnReferenceIntent,
  className,
  image,
  onImageChange,
  onNetworkChange,
  onEnvChange,
  onAddDbDsnReferenceIntentConsumed,
  cpuQuota,
  memoryQuota,
  env,
  network,
  replicasQuota,
  replicaStrategy,
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
  const syncedEnvRef = useRef<readonly ContainerEnvVar[]>(env);
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
  const [draftReplicaStrategy, setDraftReplicaStrategy] = useState(() =>
    normalizeReplicaStrategy(
      replicaStrategy,
      replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
    )
  );

  useEffect(() => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    setDraftReplicaStrategy(
      normalizeReplicaStrategy(
        replicaStrategy,
        replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
      )
    );
  }, [cpuQuota.value, memoryQuota.value, replicaStrategy, replicasQuota]);

  useEffect(() => {
    if (containerEnvRowsModelEqual(env, syncedEnvRef.current)) {
      return;
    }
    syncedEnvRef.current = env;
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
      : {
          committed: normalizeReplicaStrategy(
            replicaStrategy,
            replicasQuota.value
          ),
          draft: draftReplicaStrategy,
        }
  );

  const handleQuotaCancel = () => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    setDraftReplicaStrategy(
      normalizeReplicaStrategy(
        replicaStrategy,
        replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
      )
    );
  };

  const handleQuotaSave = async () => {
    if (onResourceQuotasCommit == null) {
      return;
    }
    const replicaPatch = replicaPatchFromDraft(
      replicasQuota != null,
      draftReplicaStrategy
    );
    setQuotaSavePending(true);
    try {
      await onResourceQuotasCommit({
        cpu: draftCpu,
        memory: draftMem,
        ...replicaPatch,
      });
    } finally {
      setQuotaSavePending(false);
    }
  };

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
      min: REPLICA_LIMITS.min,
      max: REPLICA_LIMITS.max,
      step: 1,
      ...replicasQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: (value: number) => {
          setDraftReplicaStrategy((current) => ({
            ...current,
            fixed: normalizeFixedReplicaSettings(value),
          }));
        },
        value: draftReplicaStrategy.fixed.replicas,
      };
    }
    return base;
  }, [
    draftReplicaStrategy.fixed.replicas,
    quotaCommitMode,
    readOnly,
    replicasQuota,
  ]);

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
  const handleReplicaStrategyTypeChange = (type: ReplicaStrategyType) => {
    setDraftReplicaStrategy((current) => {
      return replicaStrategyWithType(current, type);
    });
  };

  const handleElasticMinReplicasChange = (value: number) => {
    setDraftReplicaStrategy((current) => {
      const elastic = normalizeElasticReplicaSettings(
        elasticSettingsFromStrategy(current)
      );
      const minReplicas = normalizeReplicaCount(value);
      return {
        elastic: {
          ...elastic,
          maxReplicas: Math.max(minReplicas, elastic.maxReplicas),
          minReplicas,
        },
        fixed: current.fixed,
        type: "elastic",
      };
    });
  };

  const handleElasticMaxReplicasChange = (value: number) => {
    setDraftReplicaStrategy((current) => {
      const elastic = normalizeElasticReplicaSettings(
        elasticSettingsFromStrategy(current)
      );
      const maxReplicas = normalizeReplicaCount(value);
      return {
        elastic: {
          ...elastic,
          maxReplicas,
          minReplicas: Math.min(elastic.minReplicas, maxReplicas),
        },
        fixed: current.fixed,
        type: "elastic",
      };
    });
  };

  const handleElasticCpuTargetChange = (value: number) => {
    setDraftReplicaStrategy((current) => {
      const elastic = normalizeElasticReplicaSettings(
        elasticSettingsFromStrategy(current)
      );
      return {
        elastic: {
          ...elastic,
          target: {
            metric: "cpu",
            type: "utilization",
            utilizationPercent: normalizeCpuUtilizationTarget(value),
          },
        },
        fixed: current.fixed,
        type: "elastic",
      };
    });
  };

  const handleElasticMemoryTargetChange = (value: number) => {
    setDraftReplicaStrategy((current) => {
      const elastic = normalizeElasticReplicaSettings(
        elasticSettingsFromStrategy(current)
      );
      return {
        elastic: {
          ...elastic,
          target: {
            averageValue: memoryAverageMibToValue(value),
            metric: "memory",
            type: "averageValue",
          },
        },
        fixed: current.fixed,
        type: "elastic",
      };
    });
  };

  const handleElasticTargetMetricChange = (metric: ElasticTargetMetric) => {
    setDraftReplicaStrategy((current) => {
      const elastic = normalizeElasticReplicaSettings(
        elasticSettingsFromStrategy(current)
      );
      if (metric === elastic.target.metric) {
        return { elastic, fixed: current.fixed, type: "elastic" };
      }
      return {
        elastic: {
          ...elastic,
          target:
            metric === "memory"
              ? defaultMemoryElasticTarget()
              : defaultCpuElasticTarget(),
        },
        fixed: current.fixed,
        type: "elastic",
      };
    });
  };

  const replicaStrategyType = draftReplicaStrategy.type;

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
          </div>
        </section>

        {replicasSliderParts == null ? null : (
          <>
            <Separator />

            <ReplicaStrategySection
              elastic={normalizeElasticReplicaSettings(
                elasticSettingsFromStrategy(draftReplicaStrategy)
              )}
              fixedReplicasSliderParts={replicasSliderParts}
              onElasticCpuTargetChange={handleElasticCpuTargetChange}
              onElasticMaxReplicasChange={handleElasticMaxReplicasChange}
              onElasticMemoryTargetChange={handleElasticMemoryTargetChange}
              onElasticMinReplicasChange={handleElasticMinReplicasChange}
              onElasticTargetMetricChange={handleElasticTargetMetricChange}
              onStrategyTypeChange={handleReplicaStrategyTypeChange}
              readOnly={readOnly}
              strategyType={replicaStrategyType}
            />
          </>
        )}

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

        {network == null ? null : (
          <NetworkSettingsSection
            network={network}
            onNetworkChange={onNetworkChange}
            readOnly={readOnly}
          />
        )}
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
