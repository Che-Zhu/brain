import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type {
  ContainerEnvVar,
  ContainerPort,
} from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";
import { CONTAINER_ENV_VALUE_FROM_PLACEHOLDER } from "@workspace/ui/lib/container-env-rows";

import {
  readApCpuLimit,
  readApEnv,
  readApImage,
  readApInput,
  readApMemoryLimit,
  readApReplicas,
} from "./ap-spec-access";

export type WorkloadClaimKind = "AP" | "DB";

const MEM_SUFFIX_GI = /^([0-9]+(?:\.[0-9]+)?)gi$/i;
const MEM_SUFFIX_MI = /^([0-9]+(?:\.[0-9]+)?)mi$/i;
const MEM_SUFFIX_G = /^([0-9]+(?:\.[0-9]+)?)g$/i;
const MEM_SUFFIX_M = /^([0-9]+(?:\.[0-9]+)?)m$/i;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/**
 * Huma may wrap `json.RawMessage` as `{ "body": { ...resource } }`. Lists stay at top level or under body.
 */
function unwrapK8sSinglePayload(
  data: Record<string, unknown>
): Record<string, unknown> {
  if (
    asRecord(data.metadata) != null ||
    asRecord(data.spec) != null ||
    Array.isArray(data.items)
  ) {
    return data;
  }
  const lower = asRecord(data.body);
  if (lower != null) {
    return lower;
  }
  const upper = asRecord(data.Body);
  if (upper != null) {
    return upper;
  }
  return data;
}

/** Single-object body from `GET /api/k8s/.../get` (not a list). */
export function k8sGetClaimBody(
  data: K8sGetResponse | undefined
): Record<string, unknown> | undefined {
  if (data == null || typeof data !== "object") {
    return undefined;
  }
  const o = unwrapK8sSinglePayload(data as Record<string, unknown>);
  if (Array.isArray(o.items)) {
    return undefined;
  }
  if (asRecord(o.metadata) == null && asRecord(o.spec) == null) {
    return undefined;
  }
  return o;
}

/** Kubernetes cpu quantity → v cores (e.g. `500m` → 0.5, `2` → 2). */
export function parseCpuToCores(q: unknown): number | undefined {
  if (typeof q !== "string" || q.trim() === "") {
    return undefined;
  }
  const s = q.trim();
  if (s.endsWith("m")) {
    const n = Number(s.slice(0, -1));
    return Number.isFinite(n) ? n / 1000 : undefined;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Kubernetes memory quantity → MiB (integer), common suffixes only. */
export function parseMemoryToMib(q: unknown): number | undefined {
  if (typeof q !== "string" || q.trim() === "") {
    return undefined;
  }
  const s = q.trim();
  const lower = s.toLowerCase();
  const gi = MEM_SUFFIX_GI.exec(lower);
  if (gi) {
    return Math.round(Number(gi[1]) * 1024);
  }
  const mi = MEM_SUFFIX_MI.exec(lower);
  if (mi) {
    return Math.round(Number(mi[1]));
  }
  const g = MEM_SUFFIX_G.exec(lower);
  if (g) {
    return Math.round(Number(g[1]) * 1000);
  }
  const m = MEM_SUFFIX_M.exec(lower);
  if (m) {
    return Math.max(1, Math.round(Number(m[1]) / (1024 * 1024)));
  }
  const plain = Number(s);
  return Number.isFinite(plain) ? Math.round(plain) : undefined;
}

function envFromSpecEnvList(raw: unknown): ContainerEnvVar[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ContainerEnvVar[] = [];
  for (const item of raw) {
    const e = asRecord(item);
    if (e == null) {
      continue;
    }
    const name = e.name;
    if (typeof name !== "string" || name === "") {
      continue;
    }
    if (typeof e.value === "string") {
      out.push({ name, value: e.value });
    } else if (e.valueFrom != null) {
      out.push({
        name,
        value: CONTAINER_ENV_VALUE_FROM_PLACEHOLDER,
        valueFrom: e.valueFrom,
        valueSource: "valueFrom",
      });
    }
  }
  return out;
}

function portNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const STATUS_VAR_NAME = /^port-(\d+)-(internal|external)$/;

interface PortAddr {
  privateAddress?: string;
  publicAddress?: string;
}

function mergeVariablesIntoPortMap(
  variables: unknown,
  map: Map<number, PortAddr>
): void {
  if (!Array.isArray(variables)) {
    return;
  }
  for (const item of variables) {
    const v = asRecord(item);
    if (v == null) {
      continue;
    }
    const name = typeof v.name === "string" ? v.name : "";
    const value = trimStr(v.value);
    const match = STATUS_VAR_NAME.exec(name);
    if (match == null || value === "") {
      continue;
    }
    const port = Number(match[1]);
    if (!Number.isFinite(port) || port <= 0) {
      continue;
    }
    const existing = map.get(port) ?? {};
    if (match[2] === "internal") {
      existing.privateAddress = value;
    } else {
      existing.publicAddress = value;
    }
    map.set(port, existing);
  }
}

function mergeStatusEndpointsIntoPortMap(
  endpoints: unknown,
  map: Map<number, PortAddr>
): void {
  if (!Array.isArray(endpoints)) {
    return;
  }
  for (const item of endpoints) {
    const ep = asRecord(item);
    if (ep == null) {
      continue;
    }
    const port = portNum(ep.number ?? ep.port);
    if (port == null || port <= 0) {
      continue;
    }
    const privateAddress = trimStr(ep.privateAddress);
    const publicAddress = trimStr(ep.publicAddress);
    const existing = map.get(port) ?? {};
    if (privateAddress !== "" && existing.privateAddress == null) {
      existing.privateAddress = privateAddress;
    }
    if (publicAddress !== "" && existing.publicAddress == null) {
      existing.publicAddress = publicAddress;
    }
    if (existing.privateAddress != null || existing.publicAddress != null) {
      map.set(port, existing);
    }
  }
}

/**
 * Per-port addresses from `status.variables` (`port-{port}-internal|external` → URL),
 * produced by the API transform `APWithIngressesAndServicesFromList`. Falls back to
 * `status.endpoints` (`number|port`, `privateAddress`, `publicAddress`) if a deployment
 * publishes it directly.
 */
function apStatusEndpointsByPort(
  status: Record<string, unknown>
): Map<number, PortAddr> {
  const map = new Map<number, PortAddr>();
  mergeVariablesIntoPortMap(status.variables, map);
  mergeStatusEndpointsIntoPortMap(status.endpoints, map);
  return map;
}

function apPortsFromInput(input: Record<string, unknown>): ContainerPort[] {
  const raw = input.endpoints;
  const out: ContainerPort[] = [];
  if (Array.isArray(raw) && raw.length > 0) {
    for (const item of raw) {
      const ep = asRecord(item);
      if (ep == null) {
        continue;
      }
      const port = portNum(ep.port);
      if (port == null || port <= 0) {
        continue;
      }
      const host = typeof ep.host === "string" ? ep.host : "";
      out.push({
        host: host === "" ? undefined : host,
        port,
        protocol: "tcp",
      });
    }
    return out;
  }
  const singlePort = portNum(input.port);
  const singleHost = typeof input.host === "string" ? input.host : "";
  if (singlePort != null && singlePort > 0 && singleHost !== "") {
    return [{ host: singleHost, port: singlePort, protocol: "tcp" }];
  }
  return [];
}

/** Prefer observed `status.endpoints` URLs; fall back to spec shape for the same port. */
function mergeApPorts(
  spec: Record<string, unknown>,
  status: Record<string, unknown>
): ContainerPort[] {
  const byPort = apStatusEndpointsByPort(status);
  const specPorts = apPortsFromInput(readApInput(spec));

  if (byPort.size === 0) {
    return specPorts;
  }

  const merged: ContainerPort[] = [];
  const seen = new Set<number>();

  for (const p of specPorts) {
    seen.add(p.port);
    const s = byPort.get(p.port);
    if (s == null) {
      merged.push(p);
      continue;
    }
    merged.push({
      ...p,
      privateAddress: s.privateAddress ?? p.privateAddress,
      publicAddress: s.publicAddress ?? p.publicAddress,
    });
  }

  for (const [portNum, s] of byPort) {
    if (seen.has(portNum)) {
      continue;
    }
    merged.push({
      port: portNum,
      privateAddress: s.privateAddress,
      protocol: "tcp",
      publicAddress: s.publicAddress,
    });
  }

  return merged;
}

export interface ClaimContainerSettings {
  cpuCores: number;
  env: ContainerEnvVar[];
  image: string;
  memoryMib: number;
  ports: ContainerPort[];
  /** AP `spec.resource.replicas` (1–20 in UI); omitted meaning uses default for DB mapping. */
  replicas: number;
}

const CPU_MIN = 0.25;
const CPU_MAX = 16;
const MEM_MIN = 512;
const MEM_MAX = 8192;
const REPLICAS_MIN = 1;
const REPLICAS_MAX = 20;

function clampReplicas(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return 1;
  }
  const n = Math.round(raw);
  if (n <= 0) {
    return 1;
  }
  return clampScale(n, REPLICAS_MIN, REPLICAS_MAX);
}

function mapApClaim(
  spec: Record<string, unknown>,
  status: Record<string, unknown>
): ClaimContainerSettings {
  const image = readApImage(spec) ?? "—";
  const cpuRaw = parseCpuToCores(readApCpuLimit(spec));
  const memRaw = parseMemoryToMib(readApMemoryLimit(spec));
  const cpuCores = clampScale(cpuRaw ?? 1, CPU_MIN, CPU_MAX);
  const memoryMib = clampScale(memRaw ?? 512, MEM_MIN, MEM_MAX);
  const replicas = clampReplicas(readApReplicas(spec));
  return {
    cpuCores,
    env: envFromSpecEnvList(readApEnv(spec)),
    image,
    memoryMib,
    ports: mergeApPorts(spec, status),
    replicas,
  };
}

function mapDbSpec(spec: Record<string, unknown>): ClaimContainerSettings {
  const engine =
    typeof spec.engine === "string" && spec.engine.trim() !== ""
      ? spec.engine.trim()
      : "database";
  const cpuRaw = parseCpuToCores(spec.cpuLimit);
  const memRaw = parseMemoryToMib(spec.memoryLimit);
  return {
    cpuCores: clampScale(cpuRaw ?? 1, CPU_MIN, CPU_MAX),
    env: [],
    image: engine,
    memoryMib: clampScale(memRaw ?? 512, MEM_MIN, MEM_MAX),
    ports: [],
    replicas: 1,
  };
}

export function claimToContainerSettings(
  claim: Record<string, unknown> | undefined,
  workloadKind: WorkloadClaimKind
): ClaimContainerSettings {
  if (claim == null) {
    return {
      cpuCores: 1,
      env: [],
      image: "",
      memoryMib: 512,
      ports: [],
      replicas: 1,
    };
  }
  const spec = asRecord(claim.spec) ?? {};
  const status = asRecord(claim.status) ?? {};
  return workloadKind === "DB" ? mapDbSpec(spec) : mapApClaim(spec, status);
}
