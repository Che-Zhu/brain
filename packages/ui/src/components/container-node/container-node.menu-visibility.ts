import type { ContainerNodeStatusTone } from "./container-node.types";

const FAILED_PHASES = new Set<ContainerNodeStatusTone>([
  "degraded",
  "error",
  "failed",
  "inaccessible",
  "unavailable",
  "unhealthy",
]);

const HEALTHY_RUNNING_PHASES = new Set<ContainerNodeStatusTone>([
  "available",
  "bound",
  "complete",
  "ready",
  "running",
  "succeeded",
]);

const PAUSED_STOPPED_PHASES = new Set<ContainerNodeStatusTone>([
  "paused",
  "shutdown",
  "stopped",
  "suspended",
]);

const TRANSIENT_PHASES = new Set<ContainerNodeStatusTone>([
  "binding",
  "creating",
  "deleting",
  "pending",
  "progressing",
  "reconciling",
  "restarting",
  "starting",
  "stopping",
  "updating",
]);

function normalizeContainerStatusTone(input: string | undefined) {
  return input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") as ContainerNodeStatusTone | undefined;
}

export function containerNodeLifecycleMenuVisibility(
  tone: ContainerNodeStatusTone | string | undefined
): {
  showRestart: boolean;
  showStart: boolean;
  showStop: boolean;
} {
  const normalized = normalizeContainerStatusTone(tone);
  if (normalized != null && TRANSIENT_PHASES.has(normalized)) {
    return { showStart: false, showStop: false, showRestart: false };
  }
  if (normalized != null && FAILED_PHASES.has(normalized)) {
    return { showStart: false, showStop: false, showRestart: true };
  }
  if (normalized != null && HEALTHY_RUNNING_PHASES.has(normalized)) {
    return { showStart: false, showStop: true, showRestart: true };
  }
  if (normalized != null && PAUSED_STOPPED_PHASES.has(normalized)) {
    return { showStart: true, showStop: false, showRestart: true };
  }
  return { showStart: false, showStop: false, showRestart: false };
}
