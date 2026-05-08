"use client";

import type {
  CanvasMeta,
  CanvasPanelBodyProps,
  CanvasPanelTypes,
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

function containerStatesFromNode(node: Node): ContainerNodeStates | null {
  if (
    node.type !== CANVAS_CONTAINER_NODE_TYPE ||
    node.data === null ||
    typeof node.data !== "object" ||
    !("states" in node.data)
  ) {
    return null;
  }
  return (node.data as { states: ContainerNodeStates }).states;
}

export const CanvasContainerNodePanel = memo(function CanvasContainerNodePanel({
  node,
}: CanvasPanelBodyProps) {
  const states = containerStatesFromNode(node);
  if (states == null) {
    return (
      <p className="text-muted-foreground text-sm">No workload details.</p>
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">Image</span>
        <span className="break-all font-mono text-xs">{states.image}</span>
      </div>
      <div className="flex flex-row flex-wrap gap-x-6 gap-y-2">
        {states.cpuPercent != null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">CPU</span>
            <span>{states.cpuPercent}%</span>
          </div>
        )}
        {states.memoryPercent != null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Memory</span>
            <span>{states.memoryPercent}%</span>
          </div>
        )}
        {states.replicas != null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Replicas</span>
            <span>{states.replicas}</span>
          </div>
        )}
      </div>
    </div>
  );
});

CanvasContainerNodePanel.displayName = "CanvasContainerNodePanel";

/** Default `meta.panelTypes` — keys match {@link canvasDefaultNodeTypes}. */
export const canvasDefaultPanelTypes = {
  [CANVAS_CONTAINER_NODE_TYPE]: CanvasContainerNodePanel,
} as const satisfies CanvasPanelTypes;

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

/** Canvas `meta` (`nodeTypes`, `panelTypes`, `edgeTypes`, `reactFlowProps`) — not fetch-derived `state`. */
export const canvasMetaAtom = atom<CanvasMeta>({
  nodeTypes: canvasDefaultNodeTypes,
  panelTypes: canvasDefaultPanelTypes,
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
