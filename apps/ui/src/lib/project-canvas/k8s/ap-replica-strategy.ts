import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";

export const AP_REPLICA_LIMITS = { max: 20, min: 1 } as const;
export const DEFAULT_AP_FIXED_REPLICAS = AP_REPLICA_LIMITS.min;
export const DEFAULT_AP_ELASTIC_MIN_REPLICAS = AP_REPLICA_LIMITS.min;
export const DEFAULT_AP_ELASTIC_MAX_REPLICAS = 10;
export const DEFAULT_AP_ELASTIC_CPU_UTILIZATION_PERCENT = 80;
export const AP_ELASTIC_CPU_UTILIZATION_LIMITS = { max: 100, min: 1 } as const;

export interface ApCpuElasticReplicaTarget {
  metric: "cpu";
  type: "utilization";
  utilizationPercent: number;
}

export interface ApElasticReplicaSettings {
  maxReplicas: number;
  minReplicas: number;
  target: ApCpuElasticReplicaTarget;
}

export interface ApFixedReplicaStrategy {
  elastic?: ApElasticReplicaSettings;
  fixed: {
    replicas: number;
  };
  type: "fixed";
}

export interface ApElasticReplicaStrategy {
  elastic: ApElasticReplicaSettings;
  fixed: {
    replicas: number;
  };
  type: "elastic";
}

export type ApReplicaStrategy =
  | ApElasticReplicaStrategy
  | ApFixedReplicaStrategy;

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

export function validateApElasticReplicas(raw: unknown, label: string): number {
  const n = Math.round(Number(raw));
  if (
    !Number.isFinite(n) ||
    n < AP_REPLICA_LIMITS.min ||
    n > AP_REPLICA_LIMITS.max
  ) {
    throw new Error(`${label} must be between 1 and 20.`);
  }
  return n;
}

export function validateApElasticCpuUtilizationPercent(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (
    !Number.isFinite(n) ||
    n < AP_ELASTIC_CPU_UTILIZATION_LIMITS.min ||
    n > AP_ELASTIC_CPU_UTILIZATION_LIMITS.max
  ) {
    throw new Error("CPU utilization target must be between 1 and 100.");
  }
  return n;
}

export function validateApElasticReplicaSettings(
  elastic: ApElasticReplicaSettings
): ApElasticReplicaSettings {
  const minReplicas = validateApElasticReplicas(
    elastic.minReplicas,
    "Minimum replicas"
  );
  const maxReplicas = validateApElasticReplicas(
    elastic.maxReplicas,
    "Maximum replicas"
  );
  if (minReplicas > maxReplicas) {
    throw new Error(
      "Minimum replicas must be less than or equal to maximum replicas."
    );
  }
  return {
    maxReplicas,
    minReplicas,
    target: {
      metric: "cpu",
      type: "utilization",
      utilizationPercent: validateApElasticCpuUtilizationPercent(
        elastic.target.utilizationPercent
      ),
    },
  };
}

function normalizeApElasticReplicas(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return clampScale(
    Math.round(raw),
    AP_REPLICA_LIMITS.min,
    AP_REPLICA_LIMITS.max
  );
}

function normalizeApElasticCpuUtilizationPercent(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return DEFAULT_AP_ELASTIC_CPU_UTILIZATION_PERCENT;
  }
  return clampScale(
    Math.round(raw),
    AP_ELASTIC_CPU_UTILIZATION_LIMITS.min,
    AP_ELASTIC_CPU_UTILIZATION_LIMITS.max
  );
}

function normalizeApElasticReplicaSettings(
  raw: unknown
): ApElasticReplicaSettings {
  const elastic = asRecord(raw);
  const target = asRecord(elastic?.target);
  const minReplicas = normalizeApElasticReplicas(
    elastic?.minReplicas,
    DEFAULT_AP_ELASTIC_MIN_REPLICAS
  );
  const maxReplicas = Math.max(
    minReplicas,
    normalizeApElasticReplicas(
      elastic?.maxReplicas,
      DEFAULT_AP_ELASTIC_MAX_REPLICAS
    )
  );
  return {
    maxReplicas,
    minReplicas,
    target: {
      metric: "cpu",
      type: "utilization",
      utilizationPercent:
        target?.metric === "cpu" && target?.type === "utilization"
          ? normalizeApElasticCpuUtilizationPercent(target.utilizationPercent)
          : DEFAULT_AP_ELASTIC_CPU_UTILIZATION_PERCENT,
    },
  };
}

export function canonicalFixedReplicaStrategy(
  replicas: number,
  elastic?: ApElasticReplicaSettings
): ApFixedReplicaStrategy {
  return {
    ...(elastic == null
      ? {}
      : { elastic: validateApElasticReplicaSettings(elastic) }),
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

export function canonicalElasticReplicaStrategy(
  elastic: ApElasticReplicaSettings,
  fixedReplicas = DEFAULT_AP_FIXED_REPLICAS
): ApElasticReplicaStrategy {
  return {
    elastic: validateApElasticReplicaSettings(elastic),
    fixed: { replicas: validateApFixedReplicas(fixedReplicas) },
    type: "elastic",
  };
}

export function canonicalApReplicaStrategy(
  strategy: ApReplicaStrategy
): ApReplicaStrategy {
  if (strategy.type === "elastic") {
    return canonicalElasticReplicaStrategy(
      strategy.elastic,
      strategy.fixed.replicas
    );
  }
  return canonicalFixedReplicaStrategy(
    strategy.fixed.replicas,
    strategy.elastic
  );
}

export function apReplicaStrategyFromResource(
  resource: Record<string, unknown>
): ApReplicaStrategy {
  const replicaStrategy = asRecord(resource.replicaStrategy);
  const fixed = asRecord(replicaStrategy?.fixed);
  const fixedReplicas = normalizeApFixedReplicas(
    fixed?.replicas ?? resource.replicas
  );
  if (replicaStrategy?.type === "elastic") {
    return canonicalElasticReplicaStrategy(
      normalizeApElasticReplicaSettings(replicaStrategy.elastic),
      fixedReplicas
    );
  }
  if (replicaStrategy?.type === "fixed" && fixed != null) {
    return canonicalFixedReplicaStrategy(
      fixedReplicas,
      asRecord(replicaStrategy.elastic) == null
        ? undefined
        : normalizeApElasticReplicaSettings(replicaStrategy.elastic)
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
