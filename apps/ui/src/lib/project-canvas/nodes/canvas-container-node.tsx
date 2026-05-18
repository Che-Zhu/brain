"use client";

import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import type { NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import {
  containerStatesWithTelemetry,
  containerTelemetryTargetFromStates,
} from "@/lib/project-canvas/telemetry/workload-telemetry-node";
import { useWorkloadTelemetrySnapshot } from "@/lib/project-canvas/telemetry/workload-telemetry-react";
import type { CanvasContainerRfNode } from "./types";

export const CanvasContainerNode = memo(function CanvasContainerNode({
  data,
  dragging,
  id,
}: NodeProps<CanvasContainerRfNode>) {
  const { actions = {}, states } = data;
  const { name, namespace } = states;
  const telemetryTarget = useMemo(
    () => containerTelemetryTargetFromStates({ name, namespace }),
    [name, namespace]
  );
  const telemetry = useWorkloadTelemetrySnapshot(telemetryTarget);
  const statesWithTelemetry = containerStatesWithTelemetry(states, telemetry);
  const { state } = useCanvas();
  const edge = state.selectedEdge;
  const isEndpointOfSelectedEdge =
    edge != null && (edge.source === id || edge.target === id);
  const selected =
    (state.selectedNode != null && state.selectedNode.id === id) ||
    isEndpointOfSelectedEdge;

  return (
    <ContainerNode.Root
      interaction={{ dragging, selected }}
      lifecycleActions={actions.lifecycleActions}
      quickActions={actions.quickActions}
      states={statesWithTelemetry}
    >
      <ContainerNode.Content />
    </ContainerNode.Root>
  );
});

CanvasContainerNode.displayName = "CanvasContainerNode";
