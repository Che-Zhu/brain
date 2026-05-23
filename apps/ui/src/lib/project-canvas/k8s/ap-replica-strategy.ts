import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";

export const AP_REPLICA_LIMITS = { max: 20, min: 1 } as const;
export const DEFAULT_AP_FIXED_REPLICAS = AP_REPLICA_LIMITS.min;

export interface ApFixedReplicaStrategy {
  fixed: {
    replicas: number;
  };
  type: "fixed";
}

export type ApReplicaStrategy = ApFixedReplicaStrategy;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

export function normalizeApFixedReplicas(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return DEFAULT_AP_FIXED_REPLICAS;
  }
  const n = Math.round(raw);
  if (n <= 0) {
    return DEFAULT_AP_FIXED_REPLICAS;
  }
  return clampScale(n, AP_REPLICA_LIMITS.min, AP_REPLICA_LIMITS.max);
}

export function validateApFixedReplicas(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (
    !Number.isFinite(n) ||
    n < AP_REPLICA_LIMITS.min ||
    n > AP_REPLICA_LIMITS.max
  ) {
    throw new Error("Replicas must be between 1 and 20.");
  }
  return n;
}

export function canonicalFixedReplicaStrategy(
  replicas: number
): ApFixedReplicaStrategy {
  return {
    fixed: { replicas: validateApFixedReplicas(replicas) },
    type: "fixed",
  };
}

export function defaultFixedReplicaStrategy(): ApFixedReplicaStrategy {
  return {
    fixed: { replicas: DEFAULT_AP_FIXED_REPLICAS },
    type: "fixed",
  };
}

export function apReplicaStrategyFromResource(
  resource: Record<string, unknown>
): ApReplicaStrategy {
  const replicaStrategy = asRecord(resource.replicaStrategy);
  const fixed = asRecord(replicaStrategy?.fixed);
  if (replicaStrategy?.type === "fixed" && fixed != null) {
    return canonicalFixedReplicaStrategy(
      normalizeApFixedReplicas(fixed.replicas)
    );
  }
  return canonicalFixedReplicaStrategy(
    normalizeApFixedReplicas(resource.replicas)
  );
}

export function apFixedReplicasFromResource(
  resource: Record<string, unknown>
): number {
  return apReplicaStrategyFromResource(resource).fixed.replicas;
}
