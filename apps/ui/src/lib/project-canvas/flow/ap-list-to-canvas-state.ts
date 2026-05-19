import type {
  ApTelemetryMetricsRow,
  ApTelemetryResourceKind,
} from "@workspace/api/hooks";
import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import { getToneForStatus } from "@workspace/crossplane/lib/status";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v1/container-node";
import type {
  DatabaseEngineKey,
  DatabaseNodeConnection,
  DatabaseNodeStates,
} from "@workspace/ui/components/database-node/database-node";
import type {
  EntryNodeAccessDomain,
  EntryNodeTarget,
  EntryNodeTargetStatus,
} from "@workspace/ui/components/entry-node/entry-node";
import type { Edge, Node } from "@xyflow/react";

import {
  readApImage,
  readApIsPaused,
  readApReplicas,
} from "@/lib/project-canvas/k8s/ap-spec-access";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import type { CanvasDatabaseNodeData } from "../nodes/types";

const FALLBACK_COLUMNS = 3;
const FALLBACK_COL_GAP = 340;
const FALLBACK_ROW_GAP = 280;

function fallbackCanvasPosition(index: number): { x: number; y: number } {
  return {
    x: (index % FALLBACK_COLUMNS) * FALLBACK_COL_GAP,
    y: Math.floor(index / FALLBACK_COLUMNS) * FALLBACK_ROW_GAP,
  };
}

const DISPLAY_ENGINE_BY_KEY: Record<string, string> = {
  mongodb: "MongoDB",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  redis: "Redis",
};

const ENTRY_NODE_PROTOCOL_PATTERN = /^https?:\/\//;
const ENTRY_NODE_STATUS_SEPARATOR_PATTERN = /[\s_]+/g;
const ENTRY_NODE_TRAILING_SLASH_PATTERN = /\/$/;
const VERSION_NUMBER_PATTERN = /\d+(?:\.\d+)+/;

export interface WorkloadMetricPercents {
  cpuPercent?: number;
  memoryPercent?: number;
  storagePercent?: number;
}

function roundedMetricPercent(
  value: number | string | undefined
): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

/** Latest sample by `time` (max); falls back to last row if `time` is missing. */
export function telemetryLatestPercents(
  series: Record<string, number | string>[]
): WorkloadMetricPercents {
  if (series.length === 0) {
    return {};
  }
  const last = series.at(-1);
  if (last === undefined) {
    return {};
  }
  let best = last;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const row of series) {
    const t = Number(row.time);
    if (Number.isFinite(t) && t >= bestTime) {
      bestTime = t;
      best = row;
    }
  }
  const cpuPercent = roundedMetricPercent(best.cpu);
  const memoryPercent = roundedMetricPercent(best.memory);
  const storagePercent = roundedMetricPercent(best.disk);

  return {
    ...(cpuPercent === undefined ? {} : { cpuPercent }),
    ...(memoryPercent === undefined ? {} : { memoryPercent }),
    ...(storagePercent === undefined ? {} : { storagePercent }),
  };
}

/** Map key for merging telemetry into AP/DB workload nodes (`kind:ns:name`). */
export function telemetryWorkloadKey(
  kind: ApTelemetryResourceKind,
  namespace: string,
  name: string
): string {
  return `${kind}:${namespace}:${name}`;
}

export function apMetricsLookupFromResults(
  results: ApTelemetryMetricsRow[] | undefined
): Map<string, WorkloadMetricPercents> {
  const map = new Map<string, WorkloadMetricPercents>();
  if (results == null) {
    return map;
  }
  for (const r of results) {
    map.set(
      telemetryWorkloadKey(r.kind, r.namespace, r.name),
      telemetryLatestPercents(r.metrics)
    );
  }
  return map;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : undefined;
}

function metadataName(item: unknown): string | undefined {
  const meta = asRecord(asRecord(item)?.metadata)?.name;
  return typeof meta === "string" ? meta : undefined;
}

function metadataUid(item: unknown): string | undefined {
  const uid = asRecord(asRecord(item)?.metadata)?.uid;
  return typeof uid === "string" ? uid : undefined;
}

function metadataNamespace(item: unknown): string | undefined {
  const namespace = asRecord(asRecord(item)?.metadata)?.namespace;
  return typeof namespace === "string" ? namespace : undefined;
}

function nonEmptyString(input: unknown): string | undefined {
  return typeof input === "string" && input.trim() !== ""
    ? input.trim()
    : undefined;
}

function displayEngineFromKey(engineKey: string | undefined): string {
  if (engineKey === undefined) {
    return "Unknown";
  }
  const normalized = engineKey.toLowerCase();
  return DISPLAY_ENGINE_BY_KEY[normalized] ?? engineKey;
}

function formatDatabaseVersion(
  rawVersion: string | undefined,
  engineKey: string | undefined
): string | undefined {
  const version = nonEmptyString(rawVersion);
  if (version === undefined) {
    return undefined;
  }

  const numericVersion = version.match(VERSION_NUMBER_PATTERN)?.[0] ?? version;
  if (
    engineKey?.toLowerCase() === "postgresql" &&
    numericVersion.endsWith(".0")
  ) {
    return numericVersion.slice(0, -2);
  }

  return numericVersion;
}

function databaseVersionFromResource({
  engineKey,
  status,
}: {
  engineKey: string | undefined;
  status: Record<string, unknown>;
}): string | undefined {
  return formatDatabaseVersion(
    nonEmptyString(status.clusterVersionRef),
    engineKey
  );
}

function databaseStatusFromResource(status: Record<string, unknown>) {
  const phaseRaw = nonEmptyString(status.phase) ?? "";
  const label = phaseRaw === "" ? "Unknown" : phaseRaw;
  const phaseForTone = phaseRaw === "" ? "unknown" : phaseRaw.toLowerCase();
  const tone = getToneForStatus(phaseForTone) ?? "pending";
  return { label, tone };
}

function databaseMetricsFromTelemetry(
  telemetry: WorkloadMetricPercents | undefined
): DatabaseNodeStates["metrics"] {
  return {
    ...(telemetry?.cpuPercent === undefined
      ? {}
      : { cpu: telemetry.cpuPercent }),
    ...(telemetry?.memoryPercent === undefined
      ? {}
      : { memory: telemetry.memoryPercent }),
    ...(telemetry?.storagePercent === undefined
      ? {}
      : { storage: telemetry.storagePercent }),
  };
}

function databaseMetricCapacitiesFromStatus(
  status: Record<string, unknown>
): DatabaseNodeStates["metricCapacities"] | undefined {
  const effectiveResources = asRecord(status.effectiveResources);
  if (effectiveResources === undefined) {
    return undefined;
  }
  const cpuCapacity = nonEmptyString(effectiveResources.cpuLimit);
  const memoryCapacity = nonEmptyString(effectiveResources.memoryLimit);
  const storageCapacity = nonEmptyString(effectiveResources.storageSize);
  const metricCapacities: DatabaseNodeStates["metricCapacities"] = {
    ...(cpuCapacity === undefined ? {} : { cpu: cpuCapacity }),
    ...(memoryCapacity === undefined ? {} : { memory: memoryCapacity }),
    ...(storageCapacity === undefined ? {} : { storage: storageCapacity }),
  };
  return Object.keys(metricCapacities).length === 0
    ? undefined
    : metricCapacities;
}

function databaseConnectionsFromResource(
  spec: Record<string, unknown>,
  status: Record<string, unknown>
): DatabaseNodeConnection[] {
  return [
    {
      id: "private",
      kind: "private",
      label: "Private connection",
      value: nonEmptyString(status.connectionStringPrivate),
    },
    {
      id: "public",
      kind: "public",
      label: "Public connection",
      publicAccess: { enabled: spec.exposeNodePort === true },
      value: nonEmptyString(status.connectionStringPublic),
    },
  ];
}

function databaseCompositionNameFromSpec(
  spec: Record<string, unknown>
): string | undefined {
  const crossplane = asRecord(spec.crossplane);
  const crossplaneCompositionRef = asRecord(crossplane?.compositionRef);
  const crossplaneCompositionName = nonEmptyString(
    crossplaneCompositionRef?.name
  );
  if (crossplaneCompositionName !== undefined) {
    return crossplaneCompositionName;
  }

  const compositionRef = asRecord(spec.compositionRef);
  return nonEmptyString(compositionRef?.name);
}

/**
 * Maps one AP list item (example.crossplane.io/v1 `AP`) into {@link ContainerNodeStates}.
 * Sets **kind**, **image**, **name**, **replicas** (from `spec.resource`), **uid**
 * (from `metadata.uid` when present), and **status** from `status.phase`.
 * When paused or desired replicas are zero, status is shown as **Paused** regardless of `status.phase`.
 */
export function apToWorkloadStates(ap: unknown): ContainerNodeStates {
  const root = asRecord(ap) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const status = asRecord(root.status) ?? {};
  const meta = asRecord(root.metadata) ?? {};

  const name =
    typeof meta.name === "string" && meta.name !== "" ? meta.name : "unknown";
  const image = readApImage(spec) ?? "—";

  const replicas = readApReplicas(spec);

  let phaseRaw = typeof status.phase === "string" ? status.phase.trim() : "";
  if (readApIsPaused(spec)) {
    phaseRaw = "Paused";
  }

  const label = phaseRaw === "" ? "Unknown" : phaseRaw;
  const phaseForTone = phaseRaw === "" ? "unknown" : phaseRaw.toLowerCase();
  const tone = getToneForStatus(phaseForTone) ?? "pending";

  const uid = metadataUid(ap);

  return {
    kind: "AP",
    name,
    image,
    ...(typeof replicas === "number" ? { replicas } : {}),
    ...(uid != null && uid !== "" ? { uid } : {}),
    status: { label, tone },
  };
}

export interface ApsToCanvasStateOptions {
  /** Index offset for deterministic fallback placement when combining node lists. @default 0 */
  gridIndexOffset?: number;
  /** Key from {@link telemetryWorkloadKey} -> latest workload metric % from telemetry. */
  metricsLookup?: Map<string, WorkloadMetricPercents>;
  /** Used when a list item has no `metadata.namespace` (same as k8s list query). */
  namespaceFallback?: string;
}

export interface DbsToCanvasStateOptions {
  /** Composition `metadata.name` -> icon URL/data URI from composition metadata annotations. */
  compositionIconByName?: ReadonlyMap<string, string>;
  /** Index offset for deterministic fallback placement when combining node lists. @default 0 */
  gridIndexOffset?: number;
  /** Key from {@link telemetryWorkloadKey} -> latest workload metric % from telemetry. */
  metricsLookup?: Map<string, WorkloadMetricPercents>;
  /** Used when a list item has no `metadata.namespace` (same as k8s list query). */
  namespaceFallback?: string;
}

export interface EntryPointsToCanvasStateOptions {
  /** Index offset for deterministic fallback placement when combining node lists. @default 0 */
  gridIndexOffset?: number;
}

/**
 * Builds React Flow `nodes` / `edges` for the project AP list (canvas state).
 */
export function apsToCanvasState(
  data: K8sGetResponse | undefined,
  options?: ApsToCanvasStateOptions
): { edges: Edge[]; nodes: Node[] } {
  const items = apItemsFromList(data);
  const grid0 = options?.gridIndexOffset ?? 0;
  const nodes: Node[] = items.map((item, i) => {
    const stable = metadataName(item) ?? metadataUid(item) ?? `i-${i}`;
    const meta = asRecord(asRecord(item)?.metadata) ?? {};
    const ns =
      typeof meta.namespace === "string" && meta.namespace !== ""
        ? meta.namespace
        : options?.namespaceFallback;
    const n = typeof meta.name === "string" ? meta.name : "";
    const lookupKey =
      ns === undefined || ns === "" || n === ""
        ? undefined
        : telemetryWorkloadKey("ap", ns, n);
    const tel =
      lookupKey === undefined
        ? undefined
        : options?.metricsLookup?.get(lookupKey);
    const base = apToWorkloadStates(item);
    const states: ContainerNodeStates = {
      ...base,
      ...(tel?.cpuPercent === undefined ? {} : { cpuPercent: tel.cpuPercent }),
      ...(tel?.memoryPercent === undefined
        ? {}
        : { memoryPercent: tel.memoryPercent }),
      ...(ns !== undefined && ns !== "" ? { namespace: ns } : {}),
    };
    const g = grid0 + i;
    return {
      data: { states },
      id: `ap-${String(stable).replace(/\s+/g, "-")}`,
      position: fallbackCanvasPosition(g),
      type: CANVAS_CONTAINER_NODE_TYPE,
    };
  });
  return { nodes, edges: [] };
}

/**
 * Maps one DB list item (example.crossplane.io/v1 `DB`) into `DatabaseNode` props.
 */
export function dbToDatabaseNodeData(
  db: unknown,
  options?: Pick<
    DbsToCanvasStateOptions,
    "compositionIconByName" | "metricsLookup" | "namespaceFallback"
  >
): CanvasDatabaseNodeData {
  const root = asRecord(db) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const status = asRecord(root.status) ?? {};

  const name = metadataName(db) ?? "unknown";
  const namespace = metadataNamespace(db) ?? options?.namespaceFallback ?? "";
  const uid = metadataUid(db);
  const engineKey = nonEmptyString(spec.engine);
  const lookupKey =
    namespace === "" || name === ""
      ? undefined
      : telemetryWorkloadKey("db", namespace, name);
  const telemetry =
    lookupKey === undefined
      ? undefined
      : options?.metricsLookup?.get(lookupKey);

  const formattedVersion = databaseVersionFromResource({
    engineKey,
    status,
  });
  const compositionName = databaseCompositionNameFromSpec(spec);
  const iconUrl =
    compositionName === undefined
      ? undefined
      : options?.compositionIconByName?.get(compositionName);
  const metricCapacities = databaseMetricCapacitiesFromStatus(status);
  const mountPath = nonEmptyString(status.mountPath);

  const states: DatabaseNodeStates = {
    displayEngine: displayEngineFromKey(engineKey),
    ...(engineKey === undefined
      ? {}
      : { engineKey: engineKey as DatabaseEngineKey }),
    ...(formattedVersion === undefined ? {} : { formattedVersion }),
    ...(iconUrl === undefined ? {} : { iconUrl }),
    ...(metricCapacities === undefined ? {} : { metricCapacities }),
    metrics: databaseMetricsFromTelemetry(telemetry),
    ...(mountPath === undefined ? {} : { mountPath }),
    name,
    status: databaseStatusFromResource(status),
  };

  return {
    connections: databaseConnectionsFromResource(spec, status),
    states,
    ...(uid === undefined || uid === "" ? {} : { uid }),
    workload: { name, namespace },
  };
}

/**
 * Builds React Flow `nodes` / `edges` for project DB claims using `DatabaseNode`.
 */
export function dbsToCanvasState(
  data: K8sGetResponse | undefined,
  options?: DbsToCanvasStateOptions
): { edges: Edge[]; nodes: Node[] } {
  const items = apItemsFromList(data);
  const grid0 = options?.gridIndexOffset ?? 0;
  const nodes: Node[] = items.map((item, i) => {
    const stable = metadataName(item) ?? metadataUid(item) ?? `i-${i}`;
    const g = grid0 + i;
    return {
      data: dbToDatabaseNodeData(item, options),
      id: `db-${String(stable).replace(/\s+/g, "-")}`,
      position: fallbackCanvasPosition(g),
      type: CANVAS_DATABASE_NODE_TYPE,
    };
  });
  return { nodes, edges: [] };
}

/**
 * Builds React Flow `nodes` / `edges` for EntryPoint claims.
 */
export function entryPointsToCanvasState(
  data: K8sGetResponse | undefined,
  options?: EntryPointsToCanvasStateOptions
): { edges: Edge[]; nodes: Node[] } {
  const items = apItemsFromList(data);
  const grid0 = options?.gridIndexOffset ?? 0;
  const nodes: Node[] = items.map((item, i) => {
    const stable = metadataName(item) ?? metadataUid(item) ?? `i-${i}`;
    const name = metadataName(item) ?? "unknown";
    const targets = entryNodeTargetsFromResource(item);
    const accessDomain = entryNodeAccessDomainFromTargets(targets);
    const g = grid0 + i;

    return {
      data: {
        ...(accessDomain === undefined ? {} : { accessDomain }),
        states: { name },
        targets,
      },
      id: `entry-${String(stable).replace(/\s+/g, "-")}`,
      position: fallbackCanvasPosition(g),
      type: CANVAS_ENTRY_NODE_TYPE,
    };
  });
  return { nodes, edges: [] };
}

function entryPointTargets(input: unknown): unknown[] {
  const root = asRecord(input) ?? {};
  const statusTargets = asRecord(root.status)?.targets;
  if (Array.isArray(statusTargets)) {
    return statusTargets;
  }
  const specTargets = asRecord(root.spec)?.targets;
  return Array.isArray(specTargets) ? specTargets : [];
}

function entryNodeTargetsFromResource(input: unknown): EntryNodeTarget[] {
  return entryPointTargets(input)
    .map((target, index): EntryNodeTarget | undefined => {
      const record = asRecord(target) ?? {};
      const platformDomain = platformDomainFromTarget(record);
      if (platformDomain === undefined) {
        return undefined;
      }
      const port = entryPointTargetPort(record.port);
      const idPort = port === undefined ? `target-${index}` : String(port);

      return {
        id: `${idPort}-${platformDomain}`,
        label: "Public Domain",
        status: entryPointTargetStatus(record.status),
        value: `https://${platformDomain}/`,
      };
    })
    .filter((target): target is EntryNodeTarget => target !== undefined);
}

function entryNodeAccessDomainFromTargets(
  targets: readonly EntryNodeTarget[]
): EntryNodeAccessDomain | undefined {
  const first = targets[0];
  if (first === undefined) {
    return undefined;
  }
  const value = first.value
    .replace(ENTRY_NODE_PROTOCOL_PATTERN, "")
    .replace(ENTRY_NODE_TRAILING_SLASH_PATTERN, "");
  return { label: "Access domain", value };
}

function platformDomainFromTarget(
  target: Record<string, unknown>
): string | undefined {
  const raw = nonEmptyString(target.platformDomain);
  if (raw === undefined) {
    return undefined;
  }
  try {
    return new URL(raw).hostname || undefined;
  } catch {
    return (
      raw.replace(ENTRY_NODE_PROTOCOL_PATTERN, "").split("/")[0] || undefined
    );
  }
}

function entryPointTargetPort(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const n = Number(input);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function entryPointTargetStatus(
  input: unknown
): EntryNodeTargetStatus | undefined {
  const status = nonEmptyString(input);
  if (status === undefined) {
    return { label: "Unknown", tone: "unknown" };
  }
  const tone = status
    .toLowerCase()
    .replace(ENTRY_NODE_STATUS_SEPARATOR_PATTERN, "-");
  return { label: titleCaseStatus(tone), tone };
}

function titleCaseStatus(status: string): string {
  return status
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
