"use client";

import type {
  CanvasMeta,
  CanvasSelectedEdge,
  CanvasSelectedNode,
} from "@workspace/ui/components/canvas/canvas.types";
import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import { cn } from "@workspace/ui/lib/utils";
import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import { atom, getDefaultStore } from "jotai";
import { memo } from "react";

/** React Flow `type` for AP / workload container cards on the app canvas. */
export const CANVAS_CONTAINER_NODE_TYPE = "containerNode" as const;

export interface CanvasContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  states: ContainerNodeStates;
}

export type CanvasContainerRfNode = Node<
  CanvasContainerNodeData,
  typeof CANVAS_CONTAINER_NODE_TYPE
>;

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
      <ContainerNode.Root actions={actions} states={states}>
        <ContainerNode.Variant0 className="h-40 w-60" />
      </ContainerNode.Root>
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
});

CanvasContainerNode.displayName = "CanvasContainerNode";

/** Default `meta.nodeTypes` for `Canvas.Root` in this app. */
export const canvasDefaultNodeTypes = {
  [CANVAS_CONTAINER_NODE_TYPE]: CanvasContainerNode,
} as const satisfies NodeTypes;

/** Selected canvas node; `canvasMetaAtom` click handlers write via `getDefaultStore()` matching the app root `JotaiProvider` store. */
export const selectedNodeAtom = atom<CanvasSelectedNode>(null);

/** Selected canvas edge; mutually exclusive with {@link selectedNodeAtom}. */
export const selectedEdgeAtom = atom<CanvasSelectedEdge>(null);

function setCanvasSelection(
  node: CanvasSelectedNode,
  edge: CanvasSelectedEdge
) {
  const store = getDefaultStore();
  store.set(selectedNodeAtom, node);
  store.set(selectedEdgeAtom, edge);
}

/** Clears node and edge selection (e.g. closing the canvas panel). */
export function closeCanvasSelection() {
  setCanvasSelection(null, null);
}

/** Canvas `meta` (`nodeTypes`, `edgeTypes`, `reactFlowProps`) — not fetch-derived `state`. */
export const canvasMetaAtom = atom<CanvasMeta>({
  nodeTypes: canvasDefaultNodeTypes,
  reactFlowProps: {
    onNodeClick: (_event, node: Node) => {
      setCanvasSelection(node, null);
    },
    onEdgeClick: (_event, edge: Edge) => {
      setCanvasSelection(null, edge);
    },
    onPaneClick: () => {
      setCanvasSelection(null, null);
    },
  },
});
