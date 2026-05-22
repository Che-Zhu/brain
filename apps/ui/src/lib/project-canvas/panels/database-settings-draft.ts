import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";

export const DB_SETTINGS_REPLICAS = { max: 10, min: 1 } as const;

export interface DatabaseSettingsDraft {
  replicas: number;
}

export interface DatabaseSettingsPatch {
  spec: {
    replicas: number;
  };
}

function integerInRange(raw: unknown, fallback: number): number {
  let numeric = Number.NaN;
  if (typeof raw === "number") {
    numeric = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    numeric = Number(raw);
  }
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const rounded = Math.round(numeric);
  return Math.min(
    DB_SETTINGS_REPLICAS.max,
    Math.max(DB_SETTINGS_REPLICAS.min, rounded)
  );
}

export function normalizeDbSettingsReplicas(raw: unknown): number {
  return integerInRange(raw, DB_SETTINGS_REPLICAS.min);
}

export function dbSettingsDraftFromNodeData({
  desired,
}: Pick<CanvasDatabaseNodeData, "desired">): DatabaseSettingsDraft {
  return {
    replicas: normalizeDbSettingsReplicas(desired?.replicas),
  };
}

export function dbSettingsDraftIsDirty(
  original: DatabaseSettingsDraft,
  draft: DatabaseSettingsDraft
): boolean {
  return (
    normalizeDbSettingsReplicas(original.replicas) !==
    normalizeDbSettingsReplicas(draft.replicas)
  );
}

export function buildDbSettingsPatch(
  original: DatabaseSettingsDraft,
  draft: DatabaseSettingsDraft
): DatabaseSettingsPatch | null {
  const replicas = normalizeDbSettingsReplicas(draft.replicas);
  if (normalizeDbSettingsReplicas(original.replicas) === replicas) {
    return null;
  }
  return { spec: { replicas } };
}
