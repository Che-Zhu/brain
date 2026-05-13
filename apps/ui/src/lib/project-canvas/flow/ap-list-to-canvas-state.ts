import type {
  ApTelemetryMetricsRow,
  ApTelemetryResourceKind,
} from "@workspace/api/hooks";
import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import { getToneForStatus } from "@workspace/crossplane/lib/status";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v1/container-node";
import type { Edge, Node } from "@xyflow/react";

import { CANVAS_CONTAINER_NODE_TYPE } from "../nodes/constants";

const COL = 280;
const ROW = 220;

interface CpuMemoryPercents {
  cpuPercent?: number;
  memoryPercent?: number;
}

/** Latest sample by `time` (max); falls back to last row if `time` is missing. */
export function telemetryLatestPercents(
  series: Record<string, number | string>[]
): CpuMemoryPercents {
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
  const out: CpuMemoryPercents = {};
  const cpu = best.cpu;
  const mem = best.memory;
  if (cpu != null && cpu !== "") {
    const n = typeof cpu === "number" ? cpu : Number(cpu);
    if (Number.isFinite(n)) {
      out.cpuPercent = Math.round(n * 100) / 100;
    }
  }
  if (mem != null && mem !== "") {
    const n = typeof mem === "number" ? mem : Number(mem);
    if (Number.isFinite(n)) {
      out.memoryPercent = Math.round(n * 100) / 100;
    }
  }
  return out;
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
): Map<string, CpuMemoryPercents> {
  const map = new Map<string, CpuMemoryPercents>();
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

/**
 * Maps one DB list item (example.crossplane.io/v1 `DB`) into {@link ContainerNodeStates}.
 * Sets **kind**, **image**, **name**, **uid** (from `metadata.uid` when present), and **status** from `status.phase`.
 */
export function dbToWorkloadStates(db: unknown): ContainerNodeStates {
  const root = asRecord(db) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const status = asRecord(root.status) ?? {};
  const meta = asRecord(root.metadata) ?? {};

  const name =
    typeof meta.name === "string" && meta.name !== "" ? meta.name : "unknown";
  const engine =
    typeof spec.engine === "string" && spec.engine.trim() !== ""
      ? spec.engine.trim()
      : "database";

  const phaseRaw = typeof status.phase === "string" ? status.phase.trim() : "";
  const label = phaseRaw === "" ? "Unknown" : phaseRaw;
  const phaseForTone = phaseRaw === "" ? "unknown" : phaseRaw.toLowerCase();
  const tone = getToneForStatus(phaseForTone) ?? "pending";

  const uid = metadataUid(db);

  return {
    kind: "DB",
    image: engine,
    name,
    ...(uid != null && uid !== "" ? { uid } : {}),
    status: { label, tone },
  };
}

export interface ApsToCanvasStateOptions {
  /** First slot in the shared AP+DB grid (append DB nodes after APs). @default 0 */
  gridIndexOffset?: number;
  /** Key from {@link telemetryWorkloadKey} → latest CPU/memory % from telemetry. */
  metricsLookup?: Map<string, CpuMemoryPercents>;
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
      position: { x: (g % 3) * COL, y: Math.floor(g / 3) * ROW },
      type: CANVAS_CONTAINER_NODE_TYPE,
    };
  });
  return { nodes, edges: [] };
}

export type DbsToCanvasStateOptions = ApsToCanvasStateOptions;

/**
 * Builds React Flow `nodes` for the project DB (`dbs`) list — same card type as APs.
 */
export function dbsToCanvasState(
  data: K8sGetResponse | undefined,
  options?: DbsToCanvasStateOptions
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
        : telemetryWorkloadKey("db", ns, n);
    const tel =
      lookupKey === undefined
        ? undefined
        : options?.metricsLookup?.get(lookupKey);
    const base = dbToWorkloadStates(item);
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
      id: `db-${String(stable).replace(/\s+/g, "-")}`,
      position: { x: (g % 3) * COL, y: Math.floor(g / 3) * ROW },
      type: CANVAS_CONTAINER_NODE_TYPE,
    };
  });
  return { nodes, edges: [] };
}
