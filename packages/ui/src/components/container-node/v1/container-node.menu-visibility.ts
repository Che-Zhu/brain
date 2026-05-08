import type { ContainerNodeStatusTone } from "./container-node.types";

const FAILED_PHASES = new Set<ContainerNodeStatusTone>([
  "failed",
  "error",
  "deleting",
  "unavailable",
  "degraded",
]);

const HEALTHY_RUNNING_PHASES = new Set<ContainerNodeStatusTone>([
  "running",
  "succeeded",
  "complete",
  "available",
  "bound",
  "ready",
]);

const PAUSED_STOPPED_PHASES = new Set<ContainerNodeStatusTone>([
  "paused",
  "stopped",
  "shutdown",
]);

/**
 * Which lifecycle header-menu rows to show from workload `status.tone`.
 * Delete is always available when composed.
 * - Failed-like: Restart + Delete only.
 * - Healthy / running-like: Pause + Restart + Delete (no Start).
 * - Paused / stopped: Start + Restart + Delete (no Pause).
 * - Otherwise (e.g. pending): Start + Pause + Restart.
 */
export function containerNodeLifecycleMenuVisibility(
  tone: ContainerNodeStatusTone | undefined
): {
  showPause: boolean;
  showRestart: boolean;
  showStart: boolean;
} {
  if (tone != null && FAILED_PHASES.has(tone)) {
    return { showStart: false, showPause: false, showRestart: true };
  }
  if (tone != null && HEALTHY_RUNNING_PHASES.has(tone)) {
    return { showStart: false, showPause: true, showRestart: true };
  }
  if (tone != null && PAUSED_STOPPED_PHASES.has(tone)) {
    return { showStart: true, showPause: false, showRestart: true };
  }
  return { showStart: true, showPause: true, showRestart: true };
}
