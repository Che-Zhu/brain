"use client";

import {
  generateCustomDomainBindingId,
  generatePlatformAddressId,
  platformAddressEndpoint,
} from "@workspace/crossplane/lib/platform-address";
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
  ResourceSettingsInset,
  ResourceSettingsSection,
  ResourceSettingsSlider,
} from "@workspace/ui/components/resource-settings/resource-settings";
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
  MemoryStick,
  Network,
  Plus,
  Save,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  applySettingsDraftBackingResult,
  commitSettingsDraftBackingState,
  createSettingsDraftBackingState,
  failSettingsDraftSave,
  keepEditingSettingsDraftBackingState,
  reloadSettingsDraftBackingState,
  syncSettingsDraftBackingState,
} from "../../lib/settings-draft-backing";
import type { SettingsLeaveGuardRegistration } from "../../lib/settings-leave-guard";
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
  platformAddressId?: string;
  port: number;
  status?: string;
  type?: string;
  url?: string;
}

export interface ContainerNetworkCustomDomain {
  domain: string;
  id: string;
  platformAddressId: string;
  status?: string;
}

export interface ContainerNetwork {
  customDomains?: ContainerNetworkCustomDomain[];
  privateAddress?: string;
  privatePort: number;
  publicAddresses: ContainerNetworkPublicAddress[];
}

export interface ContainerNetworkPlatformAddressDraftContext {
  appName?: string;
  namespace?: string;
  routingDomain?: string;
}

export interface ContainerCustomDomainCnameVerificationResult {
  message?: string;
  ok: boolean;
  reason?: string;
}

export type ContainerCustomDomainCnameVerifier = (input: {
  domain: string;
  target: string;
}) => Promise<ContainerCustomDomainCnameVerificationResult>;

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

function cpuElasticTarget(
  utilizationPercent = DEFAULT_CPU_UTILIZATION_TARGET_PERCENT
): ContainerCpuElasticReplicaTarget {
  return {
    metric: "cpu",
    type: "utilization",
    utilizationPercent: normalizeCpuUtilizationTarget(utilizationPercent),
  };
}

function memoryElasticTarget(
  averageValue = `${DEFAULT_MEMORY_AVERAGE_TARGET_MIB}Mi`
): ContainerMemoryElasticReplicaTarget {
  return {
    averageValue: normalizeMemoryAverageTarget(averageValue),
    metric: "memory",
    type: "averageValue",
  };
}

function defaultElasticTargetForMetric(
  metric: ElasticTargetMetric
): ContainerElasticReplicaTarget {
  if (metric === "memory") {
    return memoryElasticTarget();
  }
  return cpuElasticTarget();
}

function normalizeElasticTarget(
  target: ContainerElasticReplicaSettings["target"] | undefined
): ContainerElasticReplicaTarget {
  if (target?.metric === "memory") {
    return memoryElasticTarget(target.averageValue);
  }
  return cpuElasticTarget(target?.utilizationPercent);
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

  if (a.metric === "memory") {
    return (
      b.metric === "memory" &&
      normalizeMemoryAverageTarget(a.averageValue) ===
        normalizeMemoryAverageTarget(b.averageValue)
    );
  }

  if (a.metric === "cpu") {
    return (
      b.metric === "cpu" &&
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

export function resourceQuotaReplicaPatchFromDraft(
  hasReplicasQuota: boolean,
  draftReplicaStrategy: ContainerReplicaStrategy
): ResourceQuotaReplicaPatch {
  if (!hasReplicasQuota) {
    return {};
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

export interface ContainerSettingsDraft {
  cpuCores: number;
  env: readonly ContainerEnvVar[];
  image: string;
  memoryMib: number;
  network?: ContainerNetwork;
  replicaStrategy?: ContainerReplicaStrategy;
  replicas?: number;
}

export interface ContainerSettingsPaneSettingsDraftCommitMeta
  extends Partial<ContainerSettingsPaneEnvChangeMeta> {
  baseDraft: ContainerSettingsDraft;
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
  networkPlatformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext;
  onAddDbDsnReferenceIntentConsumed?: (id: string) => void;
  onCustomDomainCnameVerify?: ContainerCustomDomainCnameVerifier;
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
   * When `replicasQuota` is set, the draft `replicaStrategy` is included on Save.
   */
  onResourceQuotasCommit?: (next: {
    cpu: number;
    memory: number;
    replicaStrategy?: ContainerReplicaStrategy;
    replicas?: number;
  }) => void | Promise<void>;
  /** Panel-level AP Settings Draft commit. When set, all editable controls save through one draft update. */
  onSettingsDraftCommit?: (
    draft: ContainerSettingsDraft,
    meta?: ContainerSettingsPaneSettingsDraftCommitMeta
  ) => void | Promise<void>;
  onSettingsDraftLeaveGuardChange?: SettingsLeaveGuardRegistration;
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

function publicAddressDraftsEqual(
  a: readonly ContainerNetworkPublicAddress[],
  b: readonly ContainerNetworkPublicAddress[]
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((address, index) => {
    const other = b[index];
    return (
      other != null &&
      (address.id?.trim() ?? "") === (other.id?.trim() ?? "") &&
      Math.round(address.port) === Math.round(other.port)
    );
  });
}

function customDomainDraftsEqual(
  a: readonly ContainerNetworkCustomDomain[] | undefined,
  b: readonly ContainerNetworkCustomDomain[] | undefined
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) {
    return false;
  }
  return left.every((domain, index) => {
    const other = right[index];
    return (
      other != null &&
      domain.id.trim() === other.id.trim() &&
      domain.domain.trim().toLowerCase() ===
        other.domain.trim().toLowerCase() &&
      domain.platformAddressId.trim() === other.platformAddressId.trim()
    );
  });
}

function containerNetworksEqual(
  a: ContainerNetwork | undefined,
  b: ContainerNetwork | undefined
): boolean {
  if (a == null || b == null) {
    return a == null && b == null;
  }
  return (
    Math.round(a.privatePort) === Math.round(b.privatePort) &&
    publicAddressDraftsEqual(a.publicAddresses, b.publicAddresses) &&
    customDomainDraftsEqual(a.customDomains, b.customDomains)
  );
}

function containerDraftResourcesDirty(
  original: ContainerSettingsDraft,
  draft: ContainerSettingsDraft
): boolean {
  const cpuMemDirty =
    Math.abs(draft.cpuCores - original.cpuCores) > CPU_QUOTA_DIRTY_EPS ||
    Math.round(draft.memoryMib) !== Math.round(original.memoryMib);
  if (cpuMemDirty) {
    return true;
  }
  if (original.replicaStrategy == null || draft.replicaStrategy == null) {
    return original.replicaStrategy !== draft.replicaStrategy;
  }
  return !replicaStrategiesEqual(
    draft.replicaStrategy,
    original.replicaStrategy
  );
}

export function containerSettingsDraftIsDirty(
  original: ContainerSettingsDraft,
  draft: ContainerSettingsDraft
): boolean {
  return (
    draft.image.trim() !== original.image.trim() ||
    !containerEnvRowsEqual([...draft.env], [...original.env]) ||
    containerDraftResourcesDirty(original, draft) ||
    !containerNetworksEqual(original.network, draft.network)
  );
}

function containerSettingsDraftBackingKey(draft: ContainerSettingsDraft) {
  return JSON.stringify(draft);
}

interface ContainerSettingsDraftValues {
  cpuCores: number;
  env: readonly ContainerEnvVar[];
  image: string;
  memoryMib: number;
  network?: ContainerNetwork;
  replicaStrategy?: ContainerReplicaStrategy;
}

function containerSettingsDraftFromValues({
  cpuCores,
  env,
  image,
  memoryMib,
  network,
  replicaStrategy,
}: ContainerSettingsDraftValues): ContainerSettingsDraft {
  return {
    cpuCores,
    env,
    image,
    memoryMib,
    ...(network == null ? {} : { network }),
    ...(replicaStrategy == null
      ? {}
      : {
          replicaStrategy,
          replicas: replicaStrategy.fixed.replicas,
        }),
  };
}

function networkWithDraftPrivatePort(
  network: ContainerNetwork | undefined,
  parsedPrivatePort: ReturnType<typeof parsePortNumberDigits> | null
): ContainerNetwork | undefined {
  if (network == null) {
    return undefined;
  }
  return {
    ...network,
    privatePort: parsedPrivatePort?.ok
      ? parsedPrivatePort.n
      : network.privatePort,
  };
}

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

function formatPlainNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatCpuCoresValue(cores: number) {
  const rounded = Number(cores.toFixed(2));
  return `${formatPlainNumber(rounded, 2)} ${rounded === 1 ? "Core" : "Cores"}`;
}

function formatMemoryMibValue(mib: number) {
  const rounded = Math.round(mib);
  if (Math.abs(rounded) >= 1024) {
    return `${formatPlainNumber(rounded / 1024, 2)} Gi`;
  }
  return `${formatPlainNumber(rounded, 0)} Mi`;
}

function formatReplicaValue(replicas: number) {
  const rounded = Math.round(replicas);
  return `${formatPlainNumber(rounded, 0)} ${
    rounded === 1 ? "Replica" : "Replicas"
  }`;
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
  onCustomDomainCnameVerify?: ContainerCustomDomainCnameVerifier;
  onNetworkChange?: (network: ContainerNetwork) => void | Promise<void>;
  onNetworkDraftChange?: (network: ContainerNetwork) => void;
  onPrivatePortDraftChange?: (value: string) => void;
  platformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext;
  privatePortDraft?: string;
  readOnly: boolean;
}

const PUBLIC_ADDRESS_VISIBLE_COUNT = 2;

function hasNetworkPanelDraftControls({
  onNetworkDraftChange,
  onPrivatePortDraftChange,
}: Pick<
  NetworkSettingsSectionProps,
  "onNetworkDraftChange" | "onPrivatePortDraftChange"
>): boolean {
  return onNetworkDraftChange != null || onPrivatePortDraftChange != null;
}

function canMutateNetworkDraft({
  onNetworkChange,
  onNetworkDraftChange,
  readOnly,
}: Pick<
  NetworkSettingsSectionProps,
  "onNetworkChange" | "onNetworkDraftChange" | "readOnly"
>): boolean {
  return !readOnly && (onNetworkDraftChange != null || onNetworkChange != null);
}

function publicAddressValue(address: ContainerNetworkPublicAddress): string {
  return address.url?.trim() || address.host?.trim() || "";
}

function publicAddressHostValue(
  address: ContainerNetworkPublicAddress | undefined
): string {
  const host = address?.host?.trim() ?? "";
  if (host !== "") {
    return host;
  }
  const url = address?.url?.trim() ?? "";
  if (url === "") {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function publicAddressStatusLabel(
  address: ContainerNetworkPublicAddress
): string {
  return address.status?.trim() || "Pending";
}

function publicAddressStatusDotClass(
  address: ContainerNetworkPublicAddress
): string {
  const status = address.status?.trim().toLowerCase();

  if (
    status === "accessible" ||
    status === "available" ||
    status === "ready" ||
    status === "running"
  ) {
    return "bg-theme-green ring-theme-green/20";
  }

  if (
    status === "progressing" ||
    status === "pending" ||
    status === "creating"
  ) {
    return "bg-theme-yellow ring-theme-yellow/20";
  }

  if (
    status === "failed" ||
    status === "error" ||
    status === "inaccessible" ||
    status === "unavailable"
  ) {
    return "bg-theme-red ring-theme-red/20";
  }

  return "bg-theme-gray ring-theme-gray/20";
}

function customDomainStatusLabel(domain: ContainerNetworkCustomDomain): string {
  return domain.status?.trim() || "Pending";
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

function customDomainKey(
  domain: ContainerNetworkCustomDomain,
  index: number
): string {
  return (
    domain.id.trim() || domain.domain.trim().toLowerCase() || `cd-${index}`
  );
}

function platformAddressDraftFromPort(
  port: number,
  platformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext
): PublicAddressDraft {
  const id = generatePlatformAddressId();
  const endpoint = platformAddressEndpoint({
    appName: platformAddressDraftContext?.appName ?? "",
    namespace: platformAddressDraftContext?.namespace ?? "",
    platformAddressId: id,
    routingDomain: platformAddressDraftContext?.routingDomain ?? "",
  });
  return {
    ...(endpoint ?? {}),
    id,
    port,
    status: "progressing",
    type: "platform",
  };
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
  onBindCustomDomain?: () => void;
  onDelete?: () => void | Promise<void>;
  readOnly: boolean;
}

function PublicAddressRow({
  address,
  onBindCustomDomain,
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
    <div className="flex min-h-17 min-w-0 items-center gap-3 rounded-md bg-muted/50 px-2.5 py-2">
      <span
        aria-label={`Public Address status: ${publicAddressStatusLabel(address)}`}
        className={cn(
          "size-3 shrink-0 rounded-full ring-4",
          publicAddressStatusDotClass(address)
        )}
        role="img"
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="min-w-0 truncate text-foreground text-sm leading-5">
          {value === "" ? "Pending domain" : value}
        </div>
        <div className="min-w-0 truncate font-mono text-muted-foreground text-sm leading-5">
          {address.port}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-label="Copy Public Address"
          className="h-9"
          disabled={value === ""}
          onClick={handleCopy}
          size="icon-lg"
          title="Copy Public Address"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden />
        </Button>
        {readOnly || onBindCustomDomain == null ? null : (
          <Button
            aria-label="Bind Custom Domain"
            className="h-9 min-w-16 px-3 text-sm"
            disabled={value === ""}
            onClick={onBindCustomDomain}
            size="lg"
            type="button"
            variant="secondary"
          >
            CNAME
          </Button>
        )}
        {readOnly || onDelete == null ? null : (
          <Button
            aria-label="Delete Public Address"
            className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            onClick={handleDelete}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

interface CustomDomainRowProps {
  domain: ContainerNetworkCustomDomain;
}

function CustomDomainRow({ domain }: CustomDomainRowProps) {
  return (
    <div className="flex min-h-17 min-w-0 items-center gap-3 rounded-md bg-muted/50 px-2.5 py-2">
      <span
        aria-label={`Custom Domain status: ${customDomainStatusLabel(domain)}`}
        className={cn(
          "size-3 shrink-0 rounded-full ring-4",
          publicAddressStatusDotClass({ port: 1, status: domain.status })
        )}
        role="img"
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="min-w-0 truncate text-foreground text-sm leading-5">
          {domain.domain}
        </div>
        <div className="min-w-0 truncate font-mono text-muted-foreground text-sm leading-5">
          {domain.platformAddressId}
        </div>
      </div>
    </div>
  );
}

function normalizeCustomDomainDraft(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/g, "");
}

interface CnameBindingDialogProps {
  address: ContainerNetworkPublicAddress | undefined;
  onBind: (domain: ContainerNetworkCustomDomain) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  verify?: ContainerCustomDomainCnameVerifier;
}

function CnameBindingDialog({
  address,
  onBind,
  onOpenChange,
  open,
  verify,
}: CnameBindingDialogProps) {
  const inputId = useId();
  const target = publicAddressHostValue(address);
  const platformAddressId = address?.id?.trim() ?? "";
  const [domainDraft, setDomainDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDomainDraft("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  const handleVerify = async () => {
    const domain = normalizeCustomDomainDraft(domainDraft);
    if (domain === "") {
      setError("Custom Domain is required.");
      return;
    }
    if (target === "" || platformAddressId === "") {
      setError("Platform Address host is not ready.");
      return;
    }
    if (verify == null) {
      setError("CNAME verification is unavailable.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await verify({ domain, target });
      if (!result.ok) {
        setError(result.message ?? "CNAME verification failed.");
        return;
      }
      onBind({
        domain,
        id: generateCustomDomainBindingId(),
        platformAddressId,
        status: "verified",
      });
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "CNAME verification failed."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bind Custom Domain</DialogTitle>
          <DialogDescription>
            Configure a CNAME record pointing to this Platform Address.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>CNAME target</Label>
            <div className="min-w-0 truncate rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-foreground text-sm">
              {target === "" ? "Pending domain" : target}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={inputId}>Custom Domain</Label>
            <Input
              aria-invalid={error != null}
              className="font-mono text-sm"
              disabled={pending}
              id={inputId}
              onChange={(event) => {
                setDomainDraft(event.target.value);
                setError(null);
              }}
              placeholder="www.example.com"
              value={domainDraft}
            />
          </div>
          {error == null ? null : (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleVerify} type="button">
            {pending ? "Verifying" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function visibleDomainRows(network: ContainerNetwork) {
  const customDomains = network.customDomains ?? [];
  const boundPlatformAddressIds = new Set(
    customDomains.map((domain) => domain.platformAddressId.trim())
  );
  return {
    customDomains,
    publicAddresses: network.publicAddresses.filter(
      (address) => !boundPlatformAddressIds.has(address.id?.trim() ?? "")
    ),
  };
}

async function commitNetworkDraft(
  network: ContainerNetwork,
  onNetworkDraftChange: ((network: ContainerNetwork) => void) | undefined,
  onNetworkChange:
    | ((network: ContainerNetwork) => void | Promise<void>)
    | undefined
) {
  if (onNetworkDraftChange != null) {
    onNetworkDraftChange(network);
    return;
  }
  if (onNetworkChange != null) {
    await onNetworkChange(network);
  }
}

interface NetworkSettingsHeaderProps {
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  pending: boolean;
  showActions: boolean;
}

function NetworkSettingsHeader({
  canSave,
  onCancel,
  onSave,
  pending,
  showActions,
}: NetworkSettingsHeaderProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <SectionTitle>Network</SectionTitle>
      {showActions ? (
        <div className="flex shrink-0 items-center gap-1">
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
            disabled={!canSave}
            onClick={async () => {
              await onSave();
            }}
            type="button"
            variant="secondary"
          >
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface PublicAddressDraft extends ContainerNetworkPublicAddress {
  id: string;
  port: number;
}

type PublicAddressDraftValidation =
  | { address: PublicAddressDraft; ok: true }
  | { message: string; ok: false };

function validatePublicAddressDraft(
  portDraft: string,
  platformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext
): PublicAddressDraftValidation {
  const parsedPort = parsePortNumberDigits(portDraft.trim());
  if (!parsedPort.ok) {
    return { message: parsedPort.message, ok: false };
  }

  return {
    address: platformAddressDraftFromPort(
      parsedPort.n,
      platformAddressDraftContext
    ),
    ok: true,
  };
}

interface AddPublicAddressFormProps {
  defaultPort: number;
  onCancel: () => void;
  onSubmit?: (address: PublicAddressDraft) => void | Promise<void>;
  platformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext;
}

function AddPublicAddressForm({
  defaultPort,
  onCancel,
  onSubmit,
  platformAddressDraftContext,
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
    const validation = validatePublicAddressDraft(
      draftPort,
      platformAddressDraftContext
    );
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
    <div className="grid min-w-0 gap-3 rounded-md border border-border border-dashed bg-background/40 p-3">
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={portInputId}>Public Address target port</Label>
        <Input
          aria-describedby={error == null ? undefined : errorId}
          aria-invalid={error != null}
          className="h-9 max-w-32 font-mono text-sm"
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
          disabled={pending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={pending || onSubmit == null}
          onClick={handleSubmit}
          size="sm"
          type="button"
          variant="secondary"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

interface DomainListSectionProps {
  addOpen: boolean;
  canMutateNetwork: boolean;
  defaultPort: number;
  domainRows: ReturnType<typeof visibleDomainRows>;
  hiddenPublicAddressCount: number;
  onAddPublicAddress: (address: PublicAddressDraft) => void | Promise<void>;
  onBindAddress: (address: ContainerNetworkPublicAddress) => void;
  onCancelAddPublicAddress: () => void;
  onDeletePublicAddress: (index: number) => void | Promise<void>;
  onOpenAddPublicAddress: () => void;
  onShowAllPublicAddresses: () => void;
  platformAddressDraftContext?: ContainerNetworkPlatformAddressDraftContext;
  readOnly: boolean;
  visiblePublicAddresses: ContainerNetworkPublicAddress[];
}

function DomainListSection({
  addOpen,
  canMutateNetwork,
  defaultPort,
  domainRows,
  hiddenPublicAddressCount,
  onAddPublicAddress,
  onBindAddress,
  onCancelAddPublicAddress,
  onDeletePublicAddress,
  onOpenAddPublicAddress,
  onShowAllPublicAddresses,
  platformAddressDraftContext,
  readOnly,
  visiblePublicAddresses,
}: DomainListSectionProps) {
  const noDomains =
    domainRows.publicAddresses.length === 0 &&
    domainRows.customDomains.length === 0;

  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-border bg-background/50 p-2.5">
      <div className="flex min-w-0 items-center gap-2 px-0.5">
        <Network
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={2}
        />
        <Label className="truncate text-foreground text-sm">Domain List</Label>
      </div>
      {readOnly ? null : (
        <Button
          aria-label="Add Public Address"
          className="h-9 w-full bg-muted/60 text-foreground text-sm hover:bg-muted"
          disabled={addOpen || !canMutateNetwork}
          onClick={onOpenAddPublicAddress}
          type="button"
          variant="secondary"
        >
          <Plus aria-hidden className="text-primary" />
          Add Domain
        </Button>
      )}
      {addOpen ? (
        <AddPublicAddressForm
          defaultPort={defaultPort}
          onCancel={onCancelAddPublicAddress}
          onSubmit={canMutateNetwork ? onAddPublicAddress : undefined}
          platformAddressDraftContext={platformAddressDraftContext}
        />
      ) : null}
      {noDomains ? (
        <div className="rounded-md border border-border border-dashed px-2.5 py-3 text-center text-muted-foreground text-xs">
          No domains yet
        </div>
      ) : (
        <div className="grid gap-2">
          {domainRows.customDomains.map((domain, index) => (
            <CustomDomainRow
              domain={domain}
              key={customDomainKey(domain, index)}
            />
          ))}
          {visiblePublicAddresses.map((address, index) => (
            <PublicAddressRow
              address={address}
              key={publicAddressKey(address, index)}
              onBindCustomDomain={
                canMutateNetwork ? () => onBindAddress(address) : undefined
              }
              onDelete={
                canMutateNetwork
                  ? () => onDeletePublicAddress(index)
                  : undefined
              }
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      {hiddenPublicAddressCount > 0 ? (
        <Button
          className="h-4 justify-self-center px-2 text-muted-foreground text-xs hover:text-foreground"
          onClick={onShowAllPublicAddresses}
          size="xs"
          type="button"
          variant="ghost"
        >
          View All
        </Button>
      ) : null}
    </div>
  );
}

function NetworkSettingsSection({
  network,
  onCustomDomainCnameVerify,
  platformAddressDraftContext,
  onNetworkDraftChange,
  onNetworkChange,
  onPrivatePortDraftChange,
  privatePortDraft,
  readOnly,
}: NetworkSettingsSectionProps) {
  const networkInputId = useId();
  const [draftPort, setDraftPort] = useState(() => String(network.privatePort));
  const [addOpen, setAddOpen] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [showAllPublicAddresses, setShowAllPublicAddresses] = useState(false);
  const [cnameAddress, setCnameAddress] = useState<
    ContainerNetworkPublicAddress | undefined
  >(undefined);
  const portDraft = privatePortDraft ?? draftPort;
  const privateAddress = network.privateAddress ?? "";
  const hasPrivateAddress = privateAddress !== "";
  const domainRows = visibleDomainRows(network);
  const usesPanelDraft = hasNetworkPanelDraftControls({
    onNetworkDraftChange,
    onPrivatePortDraftChange,
  });
  const canMutateNetwork = canMutateNetworkDraft({
    onNetworkChange,
    onNetworkDraftChange,
    readOnly,
  });
  const visiblePublicAddresses = showAllPublicAddresses
    ? domainRows.publicAddresses
    : domainRows.publicAddresses.slice(0, PUBLIC_ADDRESS_VISIBLE_COUNT);
  const hiddenPublicAddressCount =
    domainRows.publicAddresses.length - visiblePublicAddresses.length;

  useEffect(() => {
    if (privatePortDraft == null) {
      setDraftPort(String(network.privatePort));
    }
    setPortError(null);
  }, [network.privatePort, privatePortDraft]);

  useEffect(() => {
    if (domainRows.publicAddresses.length <= PUBLIC_ADDRESS_VISIBLE_COUNT) {
      setShowAllPublicAddresses(false);
    }
  }, [domainRows.publicAddresses.length]);

  const parsedPort = parsePortNumberDigits(portDraft.trim());
  const effectivePortError =
    usesPanelDraft && !parsedPort.ok ? parsedPort.message : portError;
  const portDirty = portDraft.trim() !== String(network.privatePort);
  const canSave =
    !usesPanelDraft &&
    onNetworkChange != null &&
    portDirty &&
    parsedPort.ok &&
    !savePending;

  const handleCancel = () => {
    if (onPrivatePortDraftChange == null) {
      setDraftPort(String(network.privatePort));
    } else {
      onPrivatePortDraftChange(String(network.privatePort));
    }
    setPortError(null);
  };

  const handleSave = async () => {
    if (onNetworkChange == null) {
      return;
    }
    const parsed = parsePortNumberDigits(portDraft.trim());
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
    await commitNetworkDraft(
      {
        ...network,
        publicAddresses: [...network.publicAddresses, address],
      },
      onNetworkDraftChange,
      onNetworkChange
    );
  };

  const handleDeletePublicAddress = async (index: number) => {
    const target = domainRows.publicAddresses[index];
    const publicAddresses = network.publicAddresses.filter(
      (address, itemIndex) =>
        !isPublicAddressDeleteTarget(address, itemIndex, target, index)
    );
    await commitNetworkDraft(
      { ...network, publicAddresses },
      onNetworkDraftChange,
      onNetworkChange
    );
  };

  const handleBindCustomDomain = async (
    domain: ContainerNetworkCustomDomain
  ) => {
    await commitNetworkDraft(
      {
        ...network,
        customDomains: [...(network.customDomains ?? []), domain],
      },
      onNetworkDraftChange,
      onNetworkChange
    );
  };

  return (
    <>
      <section className="flex min-w-0 flex-col gap-3">
        <NetworkSettingsHeader
          canSave={canSave}
          onCancel={handleCancel}
          onSave={handleSave}
          pending={savePending}
          showActions={!(readOnly || usesPanelDraft) && portDirty}
        />

        <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/20 p-3">
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
                effectivePortError == null
                  ? undefined
                  : `${networkInputId}-error`
              }
              aria-invalid={effectivePortError != null}
              className="h-8 max-w-32 font-mono text-xs"
              disabled={readOnly}
              id={networkInputId}
              inputMode="numeric"
              onChange={(event) => {
                if (onPrivatePortDraftChange == null) {
                  setDraftPort(event.target.value);
                } else {
                  onPrivatePortDraftChange(event.target.value);
                }
                setPortError(null);
              }}
              value={portDraft}
            />
            {effectivePortError == null ? null : (
              <p
                className="text-destructive text-xs"
                id={`${networkInputId}-error`}
                role="alert"
              >
                {effectivePortError}
              </p>
            )}
          </div>

          <DomainListSection
            addOpen={addOpen}
            canMutateNetwork={canMutateNetwork}
            defaultPort={parsedPort.ok ? parsedPort.n : network.privatePort}
            domainRows={domainRows}
            hiddenPublicAddressCount={hiddenPublicAddressCount}
            onAddPublicAddress={handleAddPublicAddress}
            onBindAddress={setCnameAddress}
            onCancelAddPublicAddress={handleCancelAddPublicAddress}
            onDeletePublicAddress={handleDeletePublicAddress}
            onOpenAddPublicAddress={() => setAddOpen(true)}
            onShowAllPublicAddresses={() => setShowAllPublicAddresses(true)}
            platformAddressDraftContext={platformAddressDraftContext}
            readOnly={readOnly}
            visiblePublicAddresses={visiblePublicAddresses}
          />
        </div>
      </section>
      <CnameBindingDialog
        address={cnameAddress}
        onBind={handleBindCustomDomain}
        onOpenChange={(open) => {
          if (!open) {
            setCnameAddress(undefined);
          }
        }}
        open={cnameAddress != null}
        verify={onCustomDomainCnameVerify}
      />
    </>
  );
}

interface ReplicaStrategySectionProps {
  actions?: ReactNode;
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

interface ReadOnlyReplicaValueProps {
  label: string;
  value: ReactNode;
}

function ReadOnlyReplicaValue({ label, value }: ReadOnlyReplicaValueProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-background/60 px-2.5 py-2">
      <span className="min-w-0 truncate text-muted-foreground text-xs">
        {label}
      </span>
      <span className="shrink-0 font-medium text-foreground text-xs tabular-nums">
        {value}
      </span>
    </div>
  );
}

function replicaStrategyDisplayName(strategyType: ReplicaStrategyType): string {
  if (strategyType === "elastic") {
    return "Elastic Scaling";
  }
  return "Fixed Replicas";
}

function elasticTargetMetricDisplayName(
  targetMetric: ElasticTargetMetric
): string {
  if (targetMetric === "memory") {
    return "Memory";
  }
  return "CPU";
}

function memoryTargetDisplayValue(
  elastic: ContainerElasticReplicaSettings,
  memoryTargetMib: number
): string {
  if (elastic.target.metric === "memory") {
    return formatMemoryMibValue(
      memoryAverageValueToMib(elastic.target.averageValue)
    );
  }
  return formatMemoryMibValue(memoryTargetMib);
}

interface ReadOnlyReplicaStrategyRowsOptions {
  cpuTargetPercent: number;
  elastic: ContainerElasticReplicaSettings;
  fixedReplicas: number;
  maxReplicas: number;
  memoryTargetMib: number;
  minReplicas: number;
  strategyType: ReplicaStrategyType;
  targetMetric: ElasticTargetMetric;
}

function readOnlyReplicaStrategyRows({
  cpuTargetPercent,
  elastic,
  fixedReplicas,
  maxReplicas,
  memoryTargetMib,
  minReplicas,
  strategyType,
  targetMetric,
}: ReadOnlyReplicaStrategyRowsOptions): ReadOnlyReplicaValueProps[] {
  const rows: ReadOnlyReplicaValueProps[] = [
    {
      label: "Strategy",
      value: replicaStrategyDisplayName(strategyType),
    },
  ];

  if (strategyType === "fixed") {
    rows.push({
      label: "Number of Replicas",
      value: formatReplicaValue(fixedReplicas),
    });
    return rows;
  }

  rows.push(
    { label: "Minimum replicas", value: formatReplicaValue(minReplicas) },
    { label: "Maximum replicas", value: formatReplicaValue(maxReplicas) },
    {
      label: "Scaling target",
      value: elasticTargetMetricDisplayName(targetMetric),
    }
  );

  if (targetMetric === "memory") {
    rows.push({
      label: "Memory average target",
      value: memoryTargetDisplayValue(elastic, memoryTargetMib),
    });
    return rows;
  }

  rows.push({
    label: "CPU utilization target",
    value: `${cpuTargetPercent}%`,
  });
  return rows;
}

interface ReadOnlyReplicaStrategySummaryProps {
  rows: readonly ReadOnlyReplicaValueProps[];
}

function ReadOnlyReplicaStrategySummary({
  rows,
}: ReadOnlyReplicaStrategySummaryProps) {
  return (
    <ResourceSettingsSection title="Replica Strategy">
      <div className="grid min-w-0 gap-2">
        {rows.map((row) => (
          <ReadOnlyReplicaValue
            key={row.label}
            label={row.label}
            value={row.value}
          />
        ))}
      </div>
    </ResourceSettingsSection>
  );
}

function ReplicaStrategySection({
  actions,
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
  const cpuTargetPercent =
    elastic.target.metric === "cpu"
      ? normalizeCpuUtilizationTarget(elastic.target.utilizationPercent)
      : DEFAULT_CPU_UTILIZATION_TARGET_PERCENT;
  const memoryTargetMib =
    elastic.target.metric === "memory"
      ? memoryAverageValueToMib(elastic.target.averageValue)
      : DEFAULT_MEMORY_AVERAGE_TARGET_MIB;

  if (readOnly) {
    return (
      <ReadOnlyReplicaStrategySummary
        rows={readOnlyReplicaStrategyRows({
          cpuTargetPercent,
          elastic,
          fixedReplicas: fixedReplicasSliderParts.replicasValue,
          maxReplicas,
          memoryTargetMib,
          minReplicas,
          strategyType,
          targetMetric,
        })}
      />
    );
  }

  return (
    <ResourceSettingsSection actions={actions} title="Replica Strategy">
      <div className="grid min-w-0 gap-3">
        <ToggleGroup
          aria-label="Replica Strategy"
          className="grid h-9 w-full grid-cols-2 rounded-lg bg-muted/40 p-0.5"
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
            className="h-8 min-w-0 rounded-md border-0 text-xs"
            data-selected={strategyType === "fixed" ? "true" : undefined}
            disabled={readOnly}
            value="fixed"
          >
            Fixed Replicas
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Elastic Scaling"
            className="h-8 min-w-0 rounded-md border-0 text-xs"
            data-selected={strategyType === "elastic" ? "true" : undefined}
            disabled={readOnly}
            value="elastic"
          >
            Elastic Scaling
          </ToggleGroupItem>
        </ToggleGroup>

        {strategyType === "fixed" ? (
          <ResourceSettingsSlider
            ariaLabel="Replica count"
            disabled={readOnly || fixedReplicasSliderParts.rest.disabled}
            formatBound={formatReplicaValue}
            formatValue={formatReplicaValue}
            label="Number of Replicas"
            max={fixedReplicasSliderParts.rest.max ?? REPLICA_LIMITS.max}
            maxDecimals={0}
            min={fixedReplicasSliderParts.rest.min ?? REPLICA_LIMITS.min}
            onValueChange={fixedReplicasSliderParts.onReplicasQuotaChange}
            step={fixedReplicasSliderParts.rest.step ?? 1}
            value={fixedReplicasSliderParts.replicasValue}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <ResourceSettingsSlider
              ariaLabel="Minimum replicas"
              disabled={readOnly}
              formatBound={formatReplicaValue}
              formatValue={formatReplicaValue}
              label="Minimum replicas"
              max={REPLICA_LIMITS.max}
              maxDecimals={0}
              min={REPLICA_LIMITS.min}
              onValueChange={onElasticMinReplicasChange}
              step={1}
              value={minReplicas}
            />

            <ResourceSettingsSlider
              ariaLabel="Maximum replicas"
              disabled={readOnly}
              formatBound={formatReplicaValue}
              formatValue={formatReplicaValue}
              label="Maximum replicas"
              max={REPLICA_LIMITS.max}
              maxDecimals={0}
              min={REPLICA_LIMITS.min}
              onValueChange={onElasticMaxReplicasChange}
              step={1}
              value={maxReplicas}
            />

            <ResourceSettingsInset>
              <Label className="text-foreground text-xs">Scaling target</Label>
              <ToggleGroup
                aria-label="Scaling target"
                className="grid h-9 w-full grid-cols-2 rounded-lg bg-background/40 p-0.5"
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
                  className="h-8 min-w-0 rounded-md border-0 text-xs"
                  data-selected={targetMetric === "cpu" ? "true" : undefined}
                  disabled={readOnly}
                  value="cpu"
                >
                  CPU utilization target
                </ToggleGroupItem>
                <ToggleGroupItem
                  aria-label="Memory average target"
                  className="h-8 min-w-0 rounded-md border-0 text-xs"
                  data-selected={targetMetric === "memory" ? "true" : undefined}
                  disabled={readOnly}
                  value="memory"
                >
                  Memory average target
                </ToggleGroupItem>
              </ToggleGroup>
            </ResourceSettingsInset>

            {targetMetric === "memory" ? (
              <ResourceSettingsSlider
                ariaLabel="Memory average target"
                disabled={readOnly}
                formatBound={formatMemoryMibValue}
                formatValue={formatMemoryMibValue}
                icon={MemoryStick}
                label="Memory average target"
                max={MEMORY_AVERAGE_TARGET_LIMITS.max}
                maxDecimals={0}
                min={MEMORY_AVERAGE_TARGET_LIMITS.min}
                onValueChange={onElasticMemoryTargetChange}
                step={1}
                value={memoryTargetMib}
              />
            ) : (
              <ResourceSettingsSlider
                ariaLabel="CPU utilization target"
                disabled={readOnly}
                formatBound={(next) => `${formatPlainNumber(next, 0)}%`}
                formatValue={(next) => `${formatPlainNumber(next, 0)}%`}
                icon={Cpu}
                label="CPU utilization target"
                max={CPU_UTILIZATION_TARGET_LIMITS.max}
                maxDecimals={0}
                min={CPU_UTILIZATION_TARGET_LIMITS.min}
                onValueChange={onElasticCpuTargetChange}
                step={1}
                value={cpuTargetPercent}
              />
            )}
          </div>
        )}
      </div>
    </ResourceSettingsSection>
  );
}

function ContainerSettingsDraftFooter({
  backingResourceChanged,
  canSave,
  dirty,
  onCancel,
  onKeepEditing,
  onReload,
  onSave,
  pending,
  saveFailureMessage,
}: {
  backingResourceChanged: boolean;
  canSave: boolean;
  dirty: boolean;
  onCancel: () => void;
  onKeepEditing: () => void;
  onReload: () => void;
  onSave: () => void | Promise<void>;
  pending: boolean;
  saveFailureMessage: string | null;
}) {
  return (
    <footer
      className="flex shrink-0 flex-col gap-2 border-border border-t pt-3"
      data-slot="container-settings-draft-actions"
    >
      {backingResourceChanged ? (
        <div
          className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-theme-yellow/40 bg-theme-yellow/10 px-2.5 py-2 text-theme-yellow text-xs leading-4"
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
          Unsaved settings changes.
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            aria-label="Cancel settings changes"
            className="h-8 px-3 text-xs"
            disabled={!dirty || pending}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            aria-label="Save settings"
            className="h-8 px-3 text-xs"
            disabled={!canSave}
            onClick={async () => {
              await onSave();
            }}
            type="button"
            variant="secondary"
          >
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
    </footer>
  );
}

/**
 * Structured readout for workload settings: container image, CPU/memory quota sliders,
 * optional replica count, environment variables, and AP Network settings.
 * All fields are controlled by the host.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: coordinates several controlled AP settings sections plus legacy section commit props.
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
  networkPlatformAddressDraftContext,
  onCustomDomainCnameVerify,
  replicasQuota,
  replicaStrategy,
  onResourceQuotasCommit,
  onSettingsDraftCommit,
  onSettingsDraftLeaveGuardChange,
  readOnly = false,
  dbDsnReferenceSources = [],
}: ContainerSettingsPaneProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [draftImage, setDraftImage] = useState(image);
  const [imageDialogDraft, setImageDialogDraft] = useState(image);
  const [quotaSavePending, setQuotaSavePending] = useState(false);
  const [settingsSavePending, setSettingsSavePending] = useState(false);
  const [draftNetwork, setDraftNetwork] = useState<
    ContainerNetwork | undefined
  >(network);
  const [networkPrivatePortDraft, setNetworkPrivatePortDraft] = useState(() =>
    network == null ? "" : String(network.privatePort)
  );
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

  const settingsCommitMode = onSettingsDraftCommit != null && readOnly !== true;
  const quotaCommitMode = onResourceQuotasCommit != null && readOnly !== true;
  const quotaDraftMode = settingsCommitMode || quotaCommitMode;

  const [draftCpu, setDraftCpu] = useState(cpuQuota.value);
  const [draftMem, setDraftMem] = useState(memoryQuota.value);
  const [draftReplicaStrategy, setDraftReplicaStrategy] = useState(() =>
    normalizeReplicaStrategy(
      replicaStrategy,
      replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
    )
  );

  useEffect(() => {
    if (settingsCommitMode) {
      return;
    }
    setDraftImage(image);
    setImageDialogDraft(image);
  }, [image, settingsCommitMode]);

  useEffect(() => {
    if (settingsCommitMode) {
      return;
    }
    setDraftNetwork(network);
    setNetworkPrivatePortDraft(
      network == null ? "" : String(network.privatePort)
    );
  }, [network, settingsCommitMode]);

  useEffect(() => {
    if (settingsCommitMode) {
      return;
    }
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    setDraftReplicaStrategy(
      normalizeReplicaStrategy(
        replicaStrategy,
        replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
      )
    );
  }, [
    cpuQuota.value,
    memoryQuota.value,
    replicaStrategy,
    replicasQuota,
    settingsCommitMode,
  ]);

  useEffect(() => {
    if (settingsCommitMode) {
      return;
    }
    if (containerEnvRowsModelEqual(env, syncedEnvRef.current)) {
      return;
    }
    syncedEnvRef.current = env;
    setEnvDraft(env);
    setEnvDraftKeys(
      createEnvDraftKeys(env.length, envDraftKeyPrefix, envDraftKeyCounter)
    );
  }, [env, envDraftKeyPrefix, settingsCommitMode]);

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
    const replicaPatch = resourceQuotaReplicaPatchFromDraft(
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
  const parsedNetworkPrivatePort =
    network == null
      ? null
      : parsePortNumberDigits(networkPrivatePortDraft.trim());
  const networkPrivatePortValid =
    parsedNetworkPrivatePort == null || parsedNetworkPrivatePort.ok;
  const activeDraftNetwork = settingsCommitMode
    ? draftNetwork
    : (draftNetwork ?? network);
  const settingsDraftNetwork = useMemo(
    () =>
      networkWithDraftPrivatePort(activeDraftNetwork, parsedNetworkPrivatePort),
    [activeDraftNetwork, parsedNetworkPrivatePort]
  );
  const committedReplicaStrategy = useMemo(
    () =>
      replicasQuota == null
        ? undefined
        : normalizeReplicaStrategy(replicaStrategy, replicasQuota.value),
    [replicaStrategy, replicasQuota]
  );
  const originalSettingsDraft = useMemo<ContainerSettingsDraft>(
    () =>
      containerSettingsDraftFromValues({
        cpuCores: cpuQuota.value,
        env,
        image,
        memoryMib: memoryQuota.value,
        network,
        replicaStrategy: committedReplicaStrategy,
      }),
    [
      committedReplicaStrategy,
      cpuQuota.value,
      env,
      image,
      memoryQuota.value,
      network,
    ]
  );
  const originalSettingsDraftKey = useMemo(
    () => containerSettingsDraftBackingKey(originalSettingsDraft),
    [originalSettingsDraft]
  );
  const settingsDraft = useMemo<ContainerSettingsDraft>(
    () =>
      containerSettingsDraftFromValues({
        cpuCores: draftCpu,
        env: envDraft,
        image: draftImage,
        memoryMib: draftMem,
        network: settingsDraftNetwork,
        replicaStrategy:
          replicasQuota == null ? undefined : draftReplicaStrategy,
      }),
    [
      draftCpu,
      draftImage,
      draftMem,
      draftReplicaStrategy,
      envDraft,
      replicasQuota,
      settingsDraftNetwork,
    ]
  );
  const [settingsBackingState, setSettingsBackingState] = useState(() =>
    createSettingsDraftBackingState(
      originalSettingsDraft,
      originalSettingsDraftKey
    )
  );
  const applySettingsDraftToLocalState = useCallback(
    (next: ContainerSettingsDraft) => {
      setDraftImage(next.image);
      setImageDialogDraft(next.image);
      setDraftCpu(next.cpuCores);
      setDraftMem(next.memoryMib);
      setDraftReplicaStrategy(
        normalizeReplicaStrategy(
          next.replicaStrategy,
          next.replicas ?? replicasQuota?.value ?? DEFAULT_FIXED_REPLICAS
        )
      );
      setEnvDraft(next.env.map((row) => ({ ...row })));
      setEnvDraftKeys(
        createEnvDraftKeys(
          next.env.length,
          envDraftKeyPrefix,
          envDraftKeyCounter
        )
      );
      syncedEnvRef.current = next.env;
      setDraftNetwork(next.network);
      setNetworkPrivatePortDraft(
        next.network == null ? "" : String(next.network.privatePort)
      );
    },
    [envDraftKeyPrefix, replicasQuota?.value]
  );
  useEffect(() => {
    if (!settingsCommitMode) {
      return;
    }
    const synced = syncSettingsDraftBackingState(settingsBackingState, {
      backing: originalSettingsDraft,
      backingKey: originalSettingsDraftKey,
      draft: settingsDraft,
      isDirty: containerSettingsDraftIsDirty,
    });
    if (synced.state === settingsBackingState && synced.draft === undefined) {
      return;
    }
    applySettingsDraftBackingResult(synced, {
      draft: applySettingsDraftToLocalState,
      state: setSettingsBackingState,
    });
  }, [
    applySettingsDraftToLocalState,
    originalSettingsDraft,
    originalSettingsDraftKey,
    settingsBackingState,
    settingsCommitMode,
    settingsDraft,
  ]);
  const settingsBaseDraft = settingsBackingState.base;
  const settingsDirty = containerSettingsDraftIsDirty(
    settingsBaseDraft,
    settingsDraft
  );
  const baseNetworkPrivatePort = settingsBaseDraft.network?.privatePort;
  const networkPrivatePortDirty =
    baseNetworkPrivatePort != null &&
    networkPrivatePortDraft.trim() !== String(baseNetworkPrivatePort);
  const panelDraftDirty = settingsDirty || networkPrivatePortDirty;
  const canSaveSettings =
    settingsCommitMode &&
    panelDraftDirty &&
    envValidation.valid &&
    networkPrivatePortValid &&
    !settingsSavePending;

  const cpuSlider = useMemo(() => {
    const base = {
      min: 0.25,
      max: 16,
      step: 0.25,
      ...cpuQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaDraftMode) {
      return {
        ...base,
        onValueChange: setDraftCpu,
        value: draftCpu,
      };
    }
    return base;
  }, [cpuQuota, draftCpu, quotaDraftMode, readOnly]);

  const memorySlider = useMemo(() => {
    const base = {
      min: 512,
      max: 8192,
      step: 128,
      ...memoryQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaDraftMode) {
      return {
        ...base,
        onValueChange: setDraftMem,
        value: draftMem,
      };
    }
    return base;
  }, [draftMem, memoryQuota, quotaDraftMode, readOnly]);

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
    if (quotaDraftMode) {
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
    quotaDraftMode,
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
          target: cpuElasticTarget(value),
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
          target: memoryElasticTarget(memoryAverageMibToValue(value)),
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
          target: defaultElasticTargetForMetric(metric),
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
  const quotaActions =
    quotaCommitMode && !settingsCommitMode && quotasDirty ? (
      <>
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
      </>
    ) : null;

  const handleImageDialogChange = (open: boolean) => {
    setImageDialogOpen(open);
    if (open) {
      setImageDialogDraft(settingsCommitMode ? draftImage : image);
    }
  };

  const handleSaveImage = () => {
    const nextImage = imageDialogDraft.trim();
    if (settingsCommitMode) {
      setDraftImage(nextImage);
    } else {
      onImageChange(nextImage);
    }
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

  const resetSettingsDraft = useCallback(() => {
    applySettingsDraftToLocalState(settingsBaseDraft);
    setImageDialogOpen(false);
    setSettingsBackingState((current) => ({
      ...current,
      saveFailureMessage: null,
    }));
  }, [applySettingsDraftToLocalState, settingsBaseDraft]);

  const reloadSettingsDraft = useCallback(() => {
    applySettingsDraftBackingResult(
      reloadSettingsDraftBackingState(settingsBackingState),
      {
        draft: applySettingsDraftToLocalState,
        state: setSettingsBackingState,
      }
    );
  }, [applySettingsDraftToLocalState, settingsBackingState]);

  const keepEditingSettingsDraft = useCallback(() => {
    setSettingsBackingState((current) =>
      keepEditingSettingsDraftBackingState(current)
    );
  }, []);

  const saveSettingsDraft = useCallback(async () => {
    if (!canSaveSettings || onSettingsDraftCommit == null) {
      throw new Error("Settings draft cannot be saved yet.");
    }
    const normalizedEnv = normalizeContainerEnvRowsForSave(envDraft);
    const confirmedAddDbDsnReferences =
      confirmedAddDbDsnReferencesFromEnvDraft(envDraft);
    const draft: ContainerSettingsDraft = {
      ...settingsDraft,
      env: normalizedEnv,
    };
    const meta: ContainerSettingsPaneSettingsDraftCommitMeta = {
      baseDraft: settingsBaseDraft,
      ...(confirmedAddDbDsnReferences.length === 0
        ? {}
        : { confirmedAddDbDsnReferences }),
    };
    setSettingsSavePending(true);
    setSettingsBackingState((current) => ({
      ...current,
      saveFailureMessage: null,
    }));
    try {
      await onSettingsDraftCommit(draft, meta);
      setSettingsBackingState((current) =>
        commitSettingsDraftBackingState(current, draft)
      );
      setEnvDraft(
        normalizedEnv.map((row, index) => {
          const intentId = envDraft[index]?.canvasAddDbDsnReferenceIntentId;
          return intentId == null
            ? row
            : { ...row, canvasAddDbDsnReferenceIntentId: intentId };
        })
      );
    } catch (error) {
      setSettingsBackingState((current) =>
        failSettingsDraftSave(current, error, "Could not save settings.")
      );
      throw error;
    } finally {
      setSettingsSavePending(false);
    }
  }, [
    canSaveSettings,
    envDraft,
    onSettingsDraftCommit,
    settingsBaseDraft,
    settingsDraft,
  ]);

  const handleSaveSettingsDraft = useCallback(async () => {
    try {
      await saveSettingsDraft();
    } catch {
      // The footer keeps the user on the draft and shows the panel-level failure.
    }
  }, [saveSettingsDraft]);

  useEffect(() => {
    if (!settingsCommitMode || onSettingsDraftLeaveGuardChange == null) {
      return;
    }

    onSettingsDraftLeaveGuardChange(
      panelDraftDirty
        ? {
            canSave: canSaveSettings,
            dirty: true,
            discard: resetSettingsDraft,
            save: saveSettingsDraft,
            scope: "ap",
          }
        : null
    );

    return () => {
      onSettingsDraftLeaveGuardChange(null);
    };
  }, [
    canSaveSettings,
    onSettingsDraftLeaveGuardChange,
    panelDraftDirty,
    resetSettingsDraft,
    saveSettingsDraft,
    settingsCommitMode,
  ]);

  const displayImage = settingsCommitMode ? draftImage : image;
  const networkForRender = settingsCommitMode ? activeDraftNetwork : network;

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
              {displayImage}
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
              {displayImage}
              <SquarePen
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          )}
        </section>

        <Separator />

        <div className="grid gap-3">
          {replicasSliderParts == null ? null : (
            <ReplicaStrategySection
              actions={quotaActions}
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
          )}

          <ResourceSettingsSection
            actions={replicasSliderParts == null ? quotaActions : undefined}
            title="CPU / Memory"
          >
            <ResourceSettingsSlider
              ariaLabel="CPU quota (cores)"
              disabled={cpuSliderRest.disabled}
              formatBound={(next) => formatPlainNumber(next, 2)}
              formatValue={formatCpuCoresValue}
              icon={Cpu}
              label="CPU"
              max={cpuSlider.max}
              maxDecimals={cpuDecimals}
              min={cpuSlider.min}
              onValueChange={onCpuQuotaChange}
              step={cpuSliderRest.step}
              value={cpuValue}
            />

            <ResourceSettingsSlider
              ariaLabel="Memory quota (MiB)"
              disabled={memorySliderRest.disabled}
              formatBound={formatMemoryMibValue}
              formatValue={formatMemoryMibValue}
              icon={MemoryStick}
              label="Memory"
              max={memorySlider.max}
              maxDecimals={memoryDecimals}
              min={memorySlider.min}
              onValueChange={onMemoryQuotaChange}
              step={memorySliderRest.step}
              value={memoryValue}
            />
          </ResourceSettingsSection>
        </div>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SectionTitle>Environment</SectionTitle>
            {readOnly ? null : (
              <div className="flex shrink-0 items-center gap-1">
                {!settingsCommitMode && envDirty ? (
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

        {networkForRender == null ? null : (
          <NetworkSettingsSection
            network={networkForRender}
            onCustomDomainCnameVerify={onCustomDomainCnameVerify}
            onNetworkChange={settingsCommitMode ? undefined : onNetworkChange}
            onNetworkDraftChange={
              settingsCommitMode ? setDraftNetwork : undefined
            }
            onPrivatePortDraftChange={
              settingsCommitMode ? setNetworkPrivatePortDraft : undefined
            }
            platformAddressDraftContext={networkPlatformAddressDraftContext}
            privatePortDraft={
              settingsCommitMode ? networkPrivatePortDraft : undefined
            }
            readOnly={readOnly}
          />
        )}

        {settingsCommitMode ? (
          <ContainerSettingsDraftFooter
            backingResourceChanged={settingsBackingState.resourceChanged}
            canSave={canSaveSettings}
            dirty={panelDraftDirty}
            onCancel={resetSettingsDraft}
            onKeepEditing={keepEditingSettingsDraft}
            onReload={reloadSettingsDraft}
            onSave={handleSaveSettingsDraft}
            pending={settingsSavePending}
            saveFailureMessage={settingsBackingState.saveFailureMessage}
          />
        ) : null}
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
                onChange={(e) => setImageDialogDraft(e.target.value)}
                placeholder="e.g. ghcr.io/org/app:1.0.0"
                value={imageDialogDraft}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => handleImageDialogChange(false)}
                type="button"
                variant="outline"
              >
                {settingsCommitMode ? "Discard" : "Cancel"}
              </Button>
              <Button onClick={handleSaveImage} type="button">
                {settingsCommitMode ? "Apply to draft" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
