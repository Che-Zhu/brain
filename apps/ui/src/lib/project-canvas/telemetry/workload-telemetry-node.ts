import type { CanvasSelectedNode } from "@workspace/ui/components/canvas/canvas.types";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v1/container-node";
import type { DatabaseNodeStates } from "@workspace/ui/components/database-node/database-node";
import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "../nodes/constants";
import type {
  CanvasContainerNodeData,
  CanvasDatabaseNodeData,
  CanvasDatabaseWorkloadRef,
} from "../nodes/types";
import type {
  WorkloadTelemetrySnapshotState,
  WorkloadTelemetryTarget,
} from "./workload-telemetry-store";

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function containerTelemetryTargetFromStates(
  states: ContainerNodeStates
): WorkloadTelemetryTarget | null {
  const namespace = nonEmpty(states.namespace);
  const name = nonEmpty(states.name);
  if (namespace === undefined || name === undefined) {
    return null;
  }
  return { kind: "ap", name, namespace };
}

export function databaseTelemetryTargetFromWorkload(
  workload: CanvasDatabaseWorkloadRef
): WorkloadTelemetryTarget | null {
  const namespace = nonEmpty(workload.namespace);
  const name = nonEmpty(workload.name);
  if (namespace === undefined || name === undefined) {
    return null;
  }
  return { kind: "db", name, namespace };
}

export function containerStatesWithTelemetry(
  states: ContainerNodeStates,
  snapshot: WorkloadTelemetrySnapshotState
): ContainerNodeStates {
  const metrics = snapshot.item?.metrics;
  if (metrics === undefined) {
    return states;
  }
  return {
    ...states,
    cpuPercent: metrics.cpu?.value,
    memoryPercent: metrics.memory?.value,
  };
}

export function databaseStatesWithTelemetry(
  states: DatabaseNodeStates,
  snapshot: WorkloadTelemetrySnapshotState
): DatabaseNodeStates {
  const metrics = snapshot.item?.metrics;
  if (metrics === undefined) {
    return states;
  }
  return {
    ...states,
    metrics: {
      ...(metrics.cpu === undefined ? {} : { cpu: metrics.cpu.value }),
      ...(metrics.memory === undefined ? {} : { memory: metrics.memory.value }),
      ...(metrics.storage === undefined
        ? {}
        : { storage: metrics.storage.value }),
    },
  };
}

export function telemetryTargetFromCanvasNode(
  node: CanvasSelectedNode | Node | null
): WorkloadTelemetryTarget | null {
  if (node === null) {
    return null;
  }
  if (node.type === CANVAS_CONTAINER_NODE_TYPE) {
    const data = node.data as CanvasContainerNodeData;
    return containerTelemetryTargetFromStates(data.states);
  }
  if (node.type === CANVAS_DATABASE_NODE_TYPE) {
    const data = node.data as CanvasDatabaseNodeData;
    return databaseTelemetryTargetFromWorkload(data.workload);
  }
  return null;
}
