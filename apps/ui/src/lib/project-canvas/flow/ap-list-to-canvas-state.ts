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
import type { Edge, Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "../nodes/constants";
import type { CanvasDatabaseNodeData } from "../nodes/types";

const FALLBACK_COLUMNS = 3;
const FALLBACK_COL_GAP = 280;
const FALLBACK_ROW_GAP = 220;

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

/**
 * Maps one AP list item (example.crossplane.io/v1 `AP`) into {@link ContainerNodeStates}.
 * Sets **kind**, **image**, **name**, **replicas** (from spec), **uid** (from
 * `metadata.uid` when present), and **status** from `status.phase`.
 * When `spec.replicas === 0`, status is shown as **Paused** regardless of `status.phase`.
 */
export function apToWorkloadStates(ap: unknown): ContainerNodeStates {
  const root = asRecord(ap) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const status = asRecord(root.status) ?? {};
  const meta = asRecord(root.metadata) ?? {};

  const name =
    typeof meta.name === "string" && meta.name !== "" ? meta.name : "unknown";
  const image =
    typeof spec.image === "string" && spec.image.trim() !== ""
      ? spec.image
      : "—";

  const replicas =
    typeof spec.replicas === "number" && Number.isFinite(spec.replicas)
      ? spec.replicas
      : undefined;

  let phaseRaw = typeof status.phase === "string" ? status.phase.trim() : "";
  if (replicas === 0) {
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
  /** Index offset for deterministic fallback placement when combining node lists. @default 0 */
  gridIndexOffset?: number;
  /** Key from {@link telemetryWorkloadKey} -> latest workload metric % from telemetry. */
  metricsLookup?: Map<string, WorkloadMetricPercents>;
  /** Used when a list item has no `metadata.namespace` (same as k8s list query). */
  namespaceFallback?: string;
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
  options?: Pick<DbsToCanvasStateOptions, "metricsLookup" | "namespaceFallback">
): CanvasDatabaseNodeData {
  const root = asRecord(db) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const status = asRecord(root.status) ?? {};

  const name = metadataName(db) ?? "unknown";
  const namespace = metadataNamespace(db) ?? options?.namespaceFallback ?? "";
  const uid = metadataUid(db);
  const engineKey = nonEmptyString(spec.engine);
  const phaseRaw =
    spec.paused === true ? "Paused" : (nonEmptyString(status.phase) ?? "");
  const label = phaseRaw === "" ? "Unknown" : phaseRaw;
  const phaseForTone = phaseRaw === "" ? "unknown" : phaseRaw.toLowerCase();
  const tone = getToneForStatus(phaseForTone) ?? "pending";
  const lookupKey =
    namespace === "" || name === ""
      ? undefined
      : telemetryWorkloadKey("db", namespace, name);
  const telemetry =
    lookupKey === undefined
      ? undefined
      : options?.metricsLookup?.get(lookupKey);

  const metrics: DatabaseNodeStates["metrics"] = {
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
  const formattedVersion = databaseVersionFromResource({
    engineKey,
    status,
  });

  const states: DatabaseNodeStates = {
    displayEngine: displayEngineFromKey(engineKey),
    ...(engineKey === undefined
      ? {}
      : { engineKey: engineKey as DatabaseEngineKey }),
    ...(formattedVersion === undefined ? {} : { formattedVersion }),
    metrics,
    name,
    status: { label, tone },
  };

  const connections: DatabaseNodeConnection[] = [
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

  return {
    connections,
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
