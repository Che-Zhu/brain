"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type { CanvasMeta } from "@workspace/ui/components/canvas/canvas.types";
import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import type { EntryNodeStates } from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { cn } from "@workspace/ui/lib/utils";
import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
  ReactFlowProvider,
} from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";

interface CanvasContainerNodeData extends Record<string, unknown> {
  states: ContainerNodeStates;
}

const PreviewCanvasContainerNode = memo(function PreviewCanvasContainerNode({
  data,
  id,
}: NodeProps<Node<CanvasContainerNodeData, "containerNode">>) {
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
      <ContainerNode.Root actions={{}} states={data.states}>
        <ContainerNode.Variant0 className="min-h-40 w-56 max-w-[min(100%,16rem)]" />
      </ContainerNode.Root>
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
});

PreviewCanvasContainerNode.displayName = "PreviewCanvasContainerNode";

const containerCanvasStatesPrimary: ContainerNodeStates = {
  cpuPercent: 42,
  image: "registry.example.io/demo:v2",
  kind: "Container",
  memoryPercent: 58,
  name: "workload-demo-001",
  replicas: 3,
  status: { label: "Running", tone: "running" },
};

const containerCanvasStatesSecondary: ContainerNodeStates = {
  cpuPercent: 18,
  image: "registry.example.io/other:v5",
  kind: "Service",
  memoryPercent: 31,
  name: "workload-demo-002",
  replicas: 1,
  status: { label: "Synced", tone: "running" },
};

/** Frozen graph preview data (mirrors `useProjectServices` canvas output without fetch). */
const CANVAS_PREVIEW_GRAPH_NODES: Node<
  CanvasContainerNodeData,
  "containerNode"
>[] = [
  {
    data: { states: containerCanvasStatesPrimary },
    id: "container-1",
    position: { x: 72, y: 56 },
    type: "containerNode",
  },
  {
    data: { states: containerCanvasStatesSecondary },
    id: "container-2",
    position: { x: 392, y: 56 },
    type: "containerNode",
  },
];

const CANVAS_PREVIEW_GRAPH_EDGES: Edge[] = [
  {
    id: "preview-edge-1",
    source: "container-1",
    target: "container-2",
  },
];

const CANVAS_PREVIEW_NODE_TYPES = {
  containerNode: PreviewCanvasContainerNode,
} as const satisfies NodeTypes;

/** Local-only selection logic (production uses Jotai + `canvasMetaAtom`). */
function useCanvasPreviewSelection(
  nodes: readonly Node[],
  edges: readonly Edge[]
) {
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const setSelection = useCallback((node: Node | null, edge: Edge | null) => {
    setSelectedNode(node);
    setSelectedEdge(edge);
  }, []);

  const canvasMeta = useMemo((): CanvasMeta => {
    return {
      nodeTypes: CANVAS_PREVIEW_NODE_TYPES,
      reactFlowProps: {
        onEdgeClick: (_event, edge) => {
          setSelection(null, edge);
        },
        onNodeClick: (_event, node) => {
          setSelection(node, null);
        },
        onPaneClick: () => {
          setSelection(null, null);
        },
      },
    };
  }, [setSelection]);

  const canvasState = useMemo(
    () => ({
      edges: [...edges],
      nodes: [...nodes],
      selectedEdge,
      selectedNode,
    }),
    [edges, nodes, selectedEdge, selectedNode]
  );

  const canvasActions = useMemo(
    () => ({
      onPanelClose: () => {
        setSelection(null, null);
      },
    }),
    [setSelection]
  );

  return {
    canvasActions,
    canvasMeta,
    canvasState,
  };
}

export default function CanvasPreview() {
  const { canvasActions, canvasMeta, canvasState } = useCanvasPreviewSelection(
    CANVAS_PREVIEW_GRAPH_NODES,
    CANVAS_PREVIEW_GRAPH_EDGES
  );

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        className="h-[min(480px,70vh)]"
        showMaximize
        title="Workspace canvas"
      >
        <ReactFlowProvider>
          <div className="relative size-full overflow-hidden rounded-xl border border-border">
            <Canvas.Root
              actions={canvasActions}
              meta={canvasMeta}
              state={canvasState}
            >
              <Canvas.Flow>
                <Canvas.Panel />
              </Canvas.Flow>
            </Canvas.Root>
          </div>
        </ReactFlowProvider>
      </Preview>
    </PreviewWrapper>
  );
}
