import type {
  CanvasNodeStatus,
  CanvasNodeStatusTone,
} from "@workspace/ui/components/canvas-node/canvas-node";
import { normalizeCanvasNodeStatus } from "@workspace/ui/components/canvas-node/canvas-node.status";

import type { EntryNodeTarget } from "./entry-node.types";

const ACCESSIBLE_TONES = new Set<CanvasNodeStatusTone>([
  "accessible",
  "available",
  "bound",
  "complete",
  "ready",
  "running",
  "succeeded",
]);

const PROGRESSING_TONES = new Set<CanvasNodeStatusTone>([
  "binding",
  "creating",
  "pending",
  "progressing",
]);

const FAILED_TONES = new Set<CanvasNodeStatusTone>([
  "error",
  "failed",
  "inaccessible",
  "unhealthy",
]);

function resolveTargetTone(status: CanvasNodeStatus | undefined) {
  return status?.tone ?? normalizeCanvasNodeStatus(status?.label);
}

function everyTone(
  tones: CanvasNodeStatusTone[],
  bucket: Set<CanvasNodeStatusTone>
) {
  return tones.every((tone) => bucket.has(tone));
}

export function resolveEntryNodeTargetStatus(
  targets: readonly EntryNodeTarget[] | undefined
): CanvasNodeStatus {
  if (!targets || targets.length === 0) {
    return { label: "Not configured", tone: "unknown" };
  }

  const tones = targets.map((target) => resolveTargetTone(target.status));

  if (everyTone(tones, ACCESSIBLE_TONES)) {
    return { label: "Accessible", tone: "accessible" };
  }

  if (everyTone(tones, PROGRESSING_TONES)) {
    return { label: "Progressing", tone: "progressing" };
  }

  if (everyTone(tones, FAILED_TONES)) {
    return { label: "Inaccessible", tone: "inaccessible" };
  }

  if (tones.every((tone) => tone === "unknown")) {
    return { label: "Not configured", tone: "unknown" };
  }

  return { label: "Degraded", tone: "degraded" };
}
