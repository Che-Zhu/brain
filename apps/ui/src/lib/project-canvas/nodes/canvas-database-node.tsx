"use client";

import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import { DatabaseNode } from "@workspace/ui/components/database-node/database-node";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { CanvasDatabaseRfNode } from "./types";

export const CanvasDatabaseNode = memo(function CanvasDatabaseNode({
  data,
  dragging,
  id,
}: NodeProps<CanvasDatabaseRfNode>) {
  const { actions = {}, connections, states } = data;
  const { state } = useCanvas();
  const edge = state.selectedEdge;
  const isEndpointOfSelectedEdge =
    edge != null && (edge.source === id || edge.target === id);
  const selected =
    (state.selectedNode != null && state.selectedNode.id === id) ||
    isEndpointOfSelectedEdge;

  return (
    <DatabaseNode.Root
      connections={connections}
      interaction={{ dragging, selected }}
      lifecycleActions={actions.lifecycleActions}
      onCopyConnection={actions.copyConnection}
      onTogglePublicConnection={actions.togglePublicConnection}
      quickActions={actions.quickActions}
      states={states}
    >
      <DatabaseNode.Content />
    </DatabaseNode.Root>
  );
});

CanvasDatabaseNode.displayName = "CanvasDatabaseNode";
