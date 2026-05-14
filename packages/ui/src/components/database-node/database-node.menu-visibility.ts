import type { DatabaseNodeStatusTone } from "./database-node.types";

const FAILED_PHASES = new Set<DatabaseNodeStatusTone>([
  "degraded",
  "deleting",
  "error",
  "failed",
  "inaccessible",
  "unhealthy",
]);

const HEALTHY_RUNNING_PHASES = new Set<DatabaseNodeStatusTone>([
  "available",
  "bound",
  "complete",
  "ready",
  "running",
  "succeeded",
]);

const PAUSED_STOPPED_PHASES = new Set<DatabaseNodeStatusTone>([
  "paused",
  "shutdown",
  "stopped",
  "suspended",
]);

function normalizeDatabaseStatusTone(input: string | undefined) {
  return input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") as DatabaseNodeStatusTone | undefined;
}

/**
 * Which DB lifecycle rows to show from workload status.
 * Delete is always available when composed by the host.
 */
export function databaseNodeLifecycleMenuVisibility(
  tone: DatabaseNodeStatusTone | string | undefined
): {
  showRestart: boolean;
  showStart: boolean;
  showStop: boolean;
} {
  const normalized = normalizeDatabaseStatusTone(tone);
  if (normalized != null && FAILED_PHASES.has(normalized)) {
    return { showStart: false, showStop: false, showRestart: true };
  }
  if (normalized != null && HEALTHY_RUNNING_PHASES.has(normalized)) {
    return { showStart: false, showStop: true, showRestart: true };
  }
  if (normalized != null && PAUSED_STOPPED_PHASES.has(normalized)) {
    return { showStart: true, showStop: false, showRestart: true };
  }
  return { showStart: true, showStop: true, showRestart: true };
}
