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

type MetricsPanelNode = Node | null;

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
  const states = containerStatesFromNode(node);
  const workloadKind = workloadClaimKindFromStates(states);
  return metricsSeriesTarget({
    kind: telemetryKindFromWorkload(workloadKind),
    name: states?.name,
    namespace,
  });
}

export function databaseMetricsDataFromNode(
  node: MetricsPanelNode
): CanvasDatabaseNodeData | null {
  if (node?.type !== CANVAS_DATABASE_NODE_TYPE) {
    return null;
  }
  return node.data as CanvasDatabaseNodeData;
}

export function databaseMetricsSeriesTarget(
  node: MetricsPanelNode,
  open: boolean
): WorkloadTelemetrySeriesTarget | null {
  if (!open) {
    return null;
  }
  const data = databaseMetricsDataFromNode(node);
  return metricsSeriesTarget({
    kind: "db",
    name: data?.workload.name,
    namespace: data?.workload.namespace,
  });
}

function metricsSeriesTarget(options: {
  kind: WorkloadTelemetrySeriesTarget["kind"];
  name: string | undefined;
  namespace: string | undefined;
}): WorkloadTelemetrySeriesTarget | null {
  const name = options.name?.trim() ?? "";
  const namespace = options.namespace?.trim() ?? "";
  if (name === "" || namespace === "") {
    return null;
  }
  return { kind: options.kind, name, namespace };
}
