"use client";

import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import { ContainerNode } from "@workspace/ui/components/container-node/v1/container-node";
import { cn } from "@workspace/ui/lib/utils";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

import type { CanvasContainerRfNode } from "./types";

export const CanvasContainerNode = memo(function CanvasContainerNode({
  data,
  id,
}: NodeProps<CanvasContainerRfNode>) {
  const { actions = {}, states } = data;
  const { state } = useCanvas();
  const edge = state.selectedEdge;
  const isEndpointOfSelectedEdge =
    edge != null && (edge.source === id || edge.target === id);
  const isOutlined =
    (state.selectedNode != null && state.selectedNode.id === id) ||
    isEndpointOfSelectedEdge;

  return (
    <div
      className={cn(
        "h-full w-full rounded-xl border border-dashed",
        isOutlined ? "border-primary" : "border-transparent"
      )}
    >
      <Handle position={Position.Top} type="target" />
      <ContainerNode.Variant1
        actions={actions}
        className="min-h-40 w-60"
        states={states}
      />
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
});

CanvasContainerNode.displayName = "CanvasContainerNode";
