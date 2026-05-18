import type { WorkloadTelemetrySeriesTarget } from "@workspace/api/hooks";
import type { Node } from "@xyflow/react";

import {
  containerStatesFromNode,
  telemetryKindFromWorkload,
  workloadClaimKindFromStates,
} from "@/lib/project-canvas/flow/container-node-workload";
import { CANVAS_DATABASE_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";

export const METRICS_SERIES_RANGE_MS = 60 * 60 * 1000;
export const METRICS_SERIES_STEP_SECONDS = 60;

type MetricsPanelNode = {
  data?: unknown;
  type?: string;
} | null;

export function workloadMetricsSeriesWindow(now = new Date()) {
  return {
    end: now,
    start: new Date(now.getTime() - METRICS_SERIES_RANGE_MS),
    stepSeconds: METRICS_SERIES_STEP_SECONDS,
  };
}

export function workloadMetricsSeriesTarget(
  node: MetricsPanelNode,
  namespace: string
): WorkloadTelemetrySeriesTarget | null {
  if (node === null) {
    return null;
  }
  const states = containerStatesFromNode(node as Node);
  const name = states?.name?.trim();
  const ns = namespace.trim();
  if (name === undefined || name === "" || ns === "") {
    return null;
  }
  const workloadKind = workloadClaimKindFromStates(states);
  return {
    kind: telemetryKindFromWorkload(workloadKind),
    name,
    namespace: ns,
  };
}

export function databaseMetricsSeriesTarget(
  node: MetricsPanelNode,
  open: boolean
): WorkloadTelemetrySeriesTarget | null {
  if (!open || node?.type !== CANVAS_DATABASE_NODE_TYPE) {
    return null;
  }
  const data = node.data as CanvasDatabaseNodeData;
  const namespace = data.workload.namespace.trim();
  const name = data.workload.name.trim();
  if (namespace === "" || name === "") {
    return null;
  }
  return { kind: "db", name, namespace };
}
