"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type {
  CanvasMeta,
  CanvasPanelBodyProps,
  CanvasPanelTypes,
} from "@workspace/ui/components/canvas/canvas.types";
import { useCanvas } from "@workspace/ui/components/canvas/canvas.use";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v1/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/v1/container-node";
import { containerNodeLifecycleMenuVisibility } from "@workspace/ui/components/container-node/v1/container-node.menu-visibility";
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
import { Cpu, MemoryStick, Pause, Play, RotateCw } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

interface CanvasContainerNodeData extends Record<string, unknown> {
  states: ContainerNodeStates;
}

const PreviewCanvasContainerNode = memo(function PreviewCanvasContainerNode({
  data,
  id,
}: NodeProps<Node<CanvasContainerNodeData, "containerNode">>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { showPause, showRestart, showStart } =
    containerNodeLifecycleMenuVisibility(data.states.status?.tone);

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
      <ContainerNode.Shell className="min-h-40 w-56 max-w-[min(100%,16rem)]">
        <ContainerNode.Header>
          <ContainerNode.HeaderMain>
            <ContainerNode.IconPlaceholder />
            <ContainerNode.HeaderTitles>
              <ContainerNode.Title name={data.states.name} />
              <ContainerNode.Kind kind={data.states.kind} />
            </ContainerNode.HeaderTitles>
          </ContainerNode.HeaderMain>
          <ContainerNode.HeaderMenuDropdown>
            <ContainerNode.HeaderMenuTrigger />
            <ContainerNode.HeaderMenuContent>
              {showStart ? (
                <ContainerNode.HeaderMenuItem
                  accentHover="positive"
                  disabled
                  icon={Play}
                >
                  Start
                </ContainerNode.HeaderMenuItem>
              ) : null}
              {showPause ? (
                <ContainerNode.HeaderMenuItem disabled icon={Pause}>
                  Pause
                </ContainerNode.HeaderMenuItem>
              ) : null}
              {showRestart ? (
                <ContainerNode.HeaderMenuItem
                  accentHover="positive"
                  disabled
                  icon={RotateCw}
                >
                  Restart
                </ContainerNode.HeaderMenuItem>
              ) : null}
              <ContainerNode.HeaderMenuDelete
                onRequestDelete={() => setDeleteDialogOpen(true)}
              />
            </ContainerNode.HeaderMenuContent>
          </ContainerNode.HeaderMenuDropdown>
        </ContainerNode.Header>
        <ContainerNode.Content>
          <ContainerNode.Image image={data.states.image} />
          <div className="nodrag nopan flex min-w-0 shrink-0 flex-wrap items-center gap-1 pt-2">
            <ContainerNode.ToolbarActivity />
            <ContainerNode.ToolbarShell />
            <ContainerNode.ToolbarLogs />
            <ContainerNode.ToolbarCalendar />
          </div>
        </ContainerNode.Content>
        <ContainerNode.Footer>
          <ContainerNode.Status
            label={data.states.status?.label}
            tone={data.states.status?.tone}
          />
          <ContainerNode.ResourceGroup>
            <ContainerNode.Resource
              icon={Cpu}
              percent={data.states.cpuPercent}
            />
            <ContainerNode.Resource
              icon={MemoryStick}
              percent={data.states.memoryPercent}
            />
            <ContainerNode.Replicas replicas={data.states.replicas} />
          </ContainerNode.ResourceGroup>
        </ContainerNode.Footer>
        <ContainerNode.DeleteDialog
          name={data.states.name}
          onOpenChange={setDeleteDialogOpen}
          open={deleteDialogOpen}
        />
      </ContainerNode.Shell>
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

/** Demo `panelTypes.containerNode`: same key as {@link CANVAS_PREVIEW_NODE_TYPES}. */
const PreviewContainerNodePanel = memo(function PreviewContainerNodePanel({
  node,
}: CanvasPanelBodyProps) {
  const states =
    node.data !== null && typeof node.data === "object" && "states" in node.data
      ? (node.data as { states: { name?: string } }).states
      : undefined;
  const label =
    states?.name != null && states.name !== "" ? states.name : node.id;
  return (
    <div className="rounded-lg border border-primary/50 border-dashed bg-primary/5 p-3">
      <p className="font-medium text-primary text-xs">
        panelTypes · containerNode
      </p>
      <p className="mt-2 text-muted-foreground text-xs">
        Registry preview: details for{" "}
        <span className="text-foreground">{label}</span>
      </p>
    </div>
  );
});

PreviewContainerNodePanel.displayName = "PreviewContainerNodePanel";

const CANVAS_PREVIEW_PANEL_TYPES = {
  containerNode: PreviewContainerNodePanel,
} as const satisfies CanvasPanelTypes;

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
      panelTypes: CANVAS_PREVIEW_PANEL_TYPES,
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
