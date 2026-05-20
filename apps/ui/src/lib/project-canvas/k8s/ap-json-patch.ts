import type {
  ContainerEnvVar,
  ContainerPort,
} from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import {
  CONTAINER_ENV_VALUE_FROM_PLACEHOLDER,
  normalizeContainerEnvRowsForSave,
  validateContainerEnvRows,
} from "@workspace/ui/lib/container-env-rows";

import { parse as parseYaml } from "yaml";

import {
  patchOpsForApInput,
  patchOpsForApResource,
  patchOpsFromEffectiveSnapshot,
  readApInput,
} from "./ap-spec-access";
import { type K8sJsonPatchOp, k8sJsonPatchResource } from "./http/json-patch";

const AP_K8S_KIND = "aps";

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
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

function assertApClaimForPatch(
  kubeconfig: string,
  claim: Record<string, unknown>
): { name: string; namespace: string } {
  const trimmedKc = kubeconfig.trim();
  if (trimmedKc === "") {
    throw new Error("Kubeconfig is missing.");
  }
  const kind =
    typeof claim.kind === "string" ? claim.kind.trim().toUpperCase() : "";
  if (kind !== "AP") {
    throw new Error("Only AP claims can be patched from container settings.");
  }
  const meta = asRecord(claim.metadata);
  const name = typeof meta?.name === "string" ? meta.name.trim() : "";
  const namespace =
    typeof meta?.namespace === "string" ? meta.namespace.trim() : "";
  if (name === "" || namespace === "") {
    throw new Error("AP claim must have metadata.name and metadata.namespace.");
  }
  return { name, namespace };
}

async function patchAp(
  kubeconfig: string,
  claim: Record<string, unknown>,
  ops: K8sJsonPatchOp[]
): Promise<void> {
  const { name, namespace } = assertApClaimForPatch(kubeconfig, claim);
  await k8sJsonPatchResource(kubeconfig, {
    kind: AP_K8S_KIND,
    name,
    namespace,
    patch: ops,
  });
}

/** Kubernetes container cpu limit string from UI cores (e.g. 0.25 → `250m`, 2 → `2`). */
export function coresToCpuLimit(cores: number): string {
  const c = Number(cores);
  if (!Number.isFinite(c) || c <= 0) {
    return "250m";
  }
  const milli = Math.round(c * 1000);
  if (milli % 1000 === 0) {
    return String(milli / 1000);
  }
  return `${milli}m`;
}

/** Kubernetes memory limit from MiB (e.g. 512 → `512Mi`). */
export function mibToMemoryLimit(mib: number): string {
  const m = Math.round(Number(mib));
  const safe = Number.isFinite(m) && m > 0 ? m : 512;
  return `${safe}Mi`;
}

function buildEnvArray(
  originalEnv: unknown,
  edited: ContainerEnvVar[]
): Record<string, unknown>[] {
  const orig = Array.isArray(originalEnv) ? originalEnv : [];
  const byName = new Map<string, Record<string, unknown>>();
  for (const item of orig) {
    const o = asRecord(item);
    if (o == null) {
      continue;
    }
    const n = o.name;
    if (typeof n === "string" && n !== "") {
      byName.set(n, o);
    }
  }

  return edited.map((e) => {
    if (e.valueSource === "valueFrom" && e.valueFrom != null) {
      return { name: e.name, valueFrom: e.valueFrom };
    }
    if (e.value === CONTAINER_ENV_VALUE_FROM_PLACEHOLDER) {
      const prev = byName.get(e.name);
      if (prev != null && prev.valueFrom != null) {
        return { name: e.name, valueFrom: prev.valueFrom };
      }
    }
    return { name: e.name, value: e.value };
  });
}

function portsToEndpoints(
  ports: ContainerPort[],
  inputSnapshot: Record<string, unknown>
): Record<string, unknown>[] {
  const raw = inputSnapshot.endpoints;
  const origEps = Array.isArray(raw) ? raw : [];
  const origByPort = new Map<number, Record<string, unknown>>();
  for (const item of origEps) {
    const o = asRecord(item);
    if (o == null) {
      continue;
    }
    const p = portNum(o.port);
    if (p != null && p > 0) {
      origByPort.set(p, o);
    }
  }

  return ports.map((cp) => {
    const prev = origByPort.get(cp.port);
    const hostFromSpec =
      cp.host != null && cp.host !== "" ? cp.host : undefined;
    const host =
      hostFromSpec ??
      (prev != null && typeof prev.host === "string" && prev.host !== ""
        ? prev.host
        : undefined);
    const publicPrev = prev?.public;
    const publicFlag = typeof publicPrev === "boolean" ? publicPrev : true;

    const ep: Record<string, unknown> = { port: cp.port };
    if (host != null) {
      ep.host = host;
    }
    if (!publicFlag) {
      ep.public = false;
    }
    return ep;
  });
}

export async function applyApImage(
  kubeconfig: string,
  claim: Record<string, unknown>,
  image: string
): Promise<void> {
  const img = image.trim();
  if (img === "") {
    throw new Error("Image reference is empty.");
  }
  const spec = asRecord(claim.spec);
  await patchAp(kubeconfig, claim, patchOpsForApInput(spec, { image: img }));
}

export async function applyApCpuLimit(
  kubeconfig: string,
  claim: Record<string, unknown>,
  cpuCores: number
): Promise<void> {
  const spec = asRecord(claim.spec);
  await patchAp(kubeconfig, claim, [
    ...patchOpsForApResource(spec, {
      limits: { cpu: coresToCpuLimit(cpuCores) },
    }),
  ]);
}

export async function applyApMemoryLimit(
  kubeconfig: string,
  claim: Record<string, unknown>,
  memoryMib: number
): Promise<void> {
  const spec = asRecord(claim.spec);
  await patchAp(kubeconfig, claim, [
    ...patchOpsForApResource(spec, {
      limits: { memory: mibToMemoryLimit(memoryMib) },
    }),
  ]);
}

/** One JSON Patch for CPU, memory, and/or replicas (avoids parallel PATCH races). */
export async function applyApResourceQuotas(
  kubeconfig: string,
  claim: Record<string, unknown>,
  next: { cpuCores: number; memoryMib: number; replicas?: number },
  previous: { cpuCores: number; memoryMib: number; replicas?: number }
): Promise<void> {
  const cpuChanged = Math.abs(next.cpuCores - previous.cpuCores) > 1e-9;
  const memChanged =
    Math.round(next.memoryMib) !== Math.round(previous.memoryMib);

  const repNext = next.replicas;
  const repPrev = previous.replicas;
  const replicasChanged =
    repNext !== undefined &&
    repPrev !== undefined &&
    Math.round(repNext) !== Math.round(repPrev);

  if (!(cpuChanged || memChanged || replicasChanged)) {
    return;
  }

  const spec = asRecord(claim.spec);
  const merge: Record<string, unknown> = {};
  const limits: Record<string, unknown> = {};
  if (cpuChanged) {
    limits.cpu = coresToCpuLimit(next.cpuCores);
  }
  if (memChanged) {
    limits.memory = mibToMemoryLimit(next.memoryMib);
  }
  if (Object.keys(limits).length > 0) {
    merge.limits = limits;
  }
  if (replicasChanged && repNext !== undefined) {
    const n = Math.round(Number(repNext));
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      throw new Error("Replicas must be between 1 and 20.");
    }
    merge.replicas = n;
  }

  await patchAp(kubeconfig, claim, patchOpsForApResource(spec, merge));
}

export function patchOpsForApEnvSettings(
  spec: Record<string, unknown> | undefined,
  env: ContainerEnvVar[]
): K8sJsonPatchOp[] {
  const normalized = normalizeContainerEnvRowsForSave(env);
  const validation = validateContainerEnvRows(normalized);
  if (!validation.valid) {
    throw new Error(validation.errors[0]?.message ?? "Invalid environment.");
  }
  const list = buildEnvArray(readApInput(spec ?? {}).env, normalized);
  return patchOpsForApInput(spec, { env: list });
}

export async function applyApEnv(
  kubeconfig: string,
  claim: Record<string, unknown>,
  env: ContainerEnvVar[]
): Promise<void> {
  const spec = asRecord(claim.spec);
  await patchAp(kubeconfig, claim, patchOpsForApEnvSettings(spec, env));
}

export async function applyApPorts(
  kubeconfig: string,
  claim: Record<string, unknown>,
  ports: ContainerPort[]
): Promise<void> {
  const spec = asRecord(claim.spec);
  const input = asRecord(spec?.input);
  const endpoints = portsToEndpoints(ports, readApInput(spec ?? {}));
  const ops = patchOpsForApInput(spec, { endpoints });
  if (input != null && Object.hasOwn(input, "port")) {
    ops.push({ op: "remove", path: "/spec/input/port" });
  }
  if (input != null && Object.hasOwn(input, "host")) {
    ops.push({ op: "remove", path: "/spec/input/host" });
  }
  await patchAp(kubeconfig, claim, ops);
}

export async function applyApReplicas(
  kubeconfig: string,
  claim: Record<string, unknown>,
  replicas: number
): Promise<void> {
  const n = Math.round(Number(replicas));
  if (!Number.isFinite(n) || n < 1 || n > 20) {
    throw new Error("Replicas must be between 1 and 20.");
  }
  const spec = asRecord(claim.spec);
  await patchAp(
    kubeconfig,
    claim,
    patchOpsForApResource(spec, { replicas: n })
  );
}

function parseEffectiveApSnapshotYaml(
  yamlText: string
): Record<string, unknown> {
  const doc = parseYaml(yamlText);
  if (doc == null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("Snapshot config.yaml must be a YAML mapping.");
  }
  return doc as Record<string, unknown>;
}

/**
 * Applies effective fields from an orphaned snapshot (`config.yaml` in `{ap}-config-snapshot-{hash}`).
 */
export async function rollbackApFromEffectiveConfigYaml(
  kubeconfig: string,
  claim: Record<string, unknown>,
  yamlText: string
): Promise<void> {
  const snap = parseEffectiveApSnapshotYaml(yamlText.trim());
  const spec = asRecord(claim.spec);

  const resource = asRecord(snap.resource);
  if (resource != null) {
    const replicas = resource.replicas;
    if (replicas != null) {
      const n = Math.round(Number(replicas));
      if (!Number.isFinite(n) || n < 0 || n > 20) {
        throw new Error("Snapshot replicas must be between 0 and 20.");
      }
    }
  }

  const input = asRecord(snap.input);
  if (input != null) {
    const image = input.image;
    if (image != null && (typeof image !== "string" || image.trim() === "")) {
      throw new Error("Snapshot is missing a valid image.");
    }
  }

  const ops = patchOpsFromEffectiveSnapshot(spec, snap);

  if (ops.length === 0) {
    throw new Error("Snapshot did not contain any applicable spec fields.");
  }

  await patchAp(kubeconfig, claim, ops);
}
