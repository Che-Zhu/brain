import type {
  CanvasNodeStatus,
  CanvasNodeVisualStatusTone,
} from "@workspace/ui/components/canvas-node/canvas-node";

import type { DatabaseNodeStatus } from "./database-node.types";

const POSITIVE_STATUSES = new Set([
  "accessible",
  "available",
  "bound",
  "complete",
  "ready",
  "running",
  "succeeded",
]);

const PROGRESS_STATUSES = new Set([
  "binding",
  "creating",
  "pending",
  "progressing",
  "reconciling",
]);

const WARNING_STATUSES = new Set(["degraded", "deleting", "stopping"]);

const NEGATIVE_STATUSES = new Set([
  "error",
  "failed",
  "inaccessible",
  "unhealthy",
]);

const NEUTRAL_STATUSES = new Set([
  "not-configured",
  "shutdown",
  "stopped",
  "suspended",
  "unconfigured",
  "unknown",
]);

function normalizeDatabaseStatusTone(input: string | undefined) {
  return input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

export function resolveDatabaseNodeVisualTone(
  status: DatabaseNodeStatus | undefined
): CanvasNodeVisualStatusTone {
  if (status?.visualTone) {
    return status.visualTone;
  }

  const tone = normalizeDatabaseStatusTone(status?.tone ?? status?.label);

  if (tone && POSITIVE_STATUSES.has(tone)) {
    return "positive";
  }

  if (tone && PROGRESS_STATUSES.has(tone)) {
    return "progress";
  }

  if (tone && WARNING_STATUSES.has(tone)) {
    return "warning";
  }

  if (tone && NEGATIVE_STATUSES.has(tone)) {
    return "negative";
  }

  if (tone && NEUTRAL_STATUSES.has(tone)) {
    return "neutral";
  }

  return "neutral";
}

export function resolveDatabaseNodeStatus(
  status: DatabaseNodeStatus | undefined
): CanvasNodeStatus {
  return {
    label: status?.label?.trim() || "Unknown",
    visualTone: resolveDatabaseNodeVisualTone(status),
  };
}
