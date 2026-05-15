"use client";

import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { CanvasEntryRfNode } from "./types";

export const CanvasEntryNode = memo(function CanvasEntryNode({
  data,
  dragging,
  id,
}: NodeProps<CanvasEntryRfNode>) {
  const { accessDomain, actions = {}, states, targets } = data;
  const { state } = useCanvas();
  const edge = state.selectedEdge;
  const isEndpointOfSelectedEdge =
    edge != null && (edge.source === id || edge.target === id);
  const selected =
    (state.selectedNode != null && state.selectedNode.id === id) ||
    isEndpointOfSelectedEdge;

  return (
    <EntryNode.Root
      accessDomain={accessDomain}
      interaction={{ dragging, selected }}
      onCopyTarget={actions.copyTarget}
      states={states}
      targets={targets}
    >
      <EntryNode.Content />
    </EntryNode.Root>
  );
});

CanvasEntryNode.displayName = "CanvasEntryNode";
