"use client";

import { mockApConfigSnapshotRows } from "@registry/linear/components/container-history-pane/container-history-mock";
import {
  buildMockLogs,
  LOG_VIEWER_PREVIEW_QUICK_RANGE_MS,
} from "@registry/linear/components/log-viewer/log-viewer-mock";
import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type {
  CanvasMeta,
  CanvasPanelBodyProps,
  CanvasPanelTab,
} from "@workspace/ui/components/canvas/canvas.types";
import { ContainerHistoryPane } from "@workspace/ui/components/container-history-pane/container-history-pane";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import {
  type ContainerEnvVar,
  type ContainerPort,
  ContainerSettingsPane,
} from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import { LogViewer } from "@workspace/ui/components/log-viewer/log-viewer";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { MetricsPane } from "@workspace/ui/components/metrics-pane/metrics-pane";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";
import type { TimeRange } from "@workspace/ui/components/time-range-selector";
import {
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  ReactFlowProvider,
} from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";

interface CanvasContainerNodeData extends Record<string, unknown> {
  defaultExpanded?: boolean;
  states: ContainerNodeStates;
}

const SAMPLE_BASE_SECONDS = Math.floor(Date.now() / 1000) - 3600;
const CANVAS_PREVIEW_PERCENT_SUFFIX_PATTERN = /%$/;

function buildSampleSeries(
  count: number,
  offset: number,
  amplitude: number
): MetricsData[string] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: SAMPLE_BASE_SECONDS + i * 300,
    value: Math.min(
      100,
      Math.max(0, offset + amplitude * Math.sin(i * 0.42) + i * 0.7)
    ),
  }));
}

/** Demo metrics fed into {@link MetricsPane} on the container node panel Metrics tab. */
const CANVAS_PREVIEW_METRICS_DATA: MetricsData = {
  cpu: buildSampleSeries(12, 48, 16),
  memory: buildSampleSeries(12, 36, 12),
  storage: buildSampleSeries(10, 40, 8),
};

const CANVAS_PREVIEW_SETTINGS_DEMO_ENV: ContainerEnvVar[] = [
  { name: "NODE_ENV", value: "production" },
  { name: "LOG_LEVEL", value: "info" },
];

const CANVAS_PREVIEW_SETTINGS_DEMO_PORTS: ContainerPort[] = [
  { port: 8080, protocol: "tcp" },
  { port: 8443, protocol: "tcp" },
];

function canvasPreviewStatesFromNode(node: Node): ContainerNodeStates | null {
  if (
    node.data === null ||
    typeof node.data !== "object" ||
    !("states" in node.data)
  ) {
    return null;
  }
  return (node.data as CanvasContainerNodeData).states;
}

function canvasPreviewMetricPercent(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const n = Number(
    value.trim().replace(CANVAS_PREVIEW_PERCENT_SUFFIX_PATTERN, "")
  );
  return Number.isFinite(n) ? n : undefined;
}

/** Settings tab body: mirrors container settings registry preview, seeded from node `states`. */
function CanvasPreviewContainerSettingsTab({ node }: CanvasPanelBodyProps) {
  const states = canvasPreviewStatesFromNode(node);
  const imageSeed =
    states?.image != null && states.image !== ""
      ? states.image
      : "registry.example.io/unknown:latest";
  const cpuInit = clampScale(
    ((canvasPreviewMetricPercent(states?.metrics?.cpu) ?? 50) / 100) * 4,
    0.25,
    8
  );
  const memInit = clampScale(
    Math.round(
      (((canvasPreviewMetricPercent(states?.metrics?.memory) ?? 50) / 100) *
        4096) /
        128
    ) * 128,
    512,
    4096
  );

  const [image, setImage] = useState(imageSeed);
  const [env, setEnv] = useState<ContainerEnvVar[]>(() => [
    ...CANVAS_PREVIEW_SETTINGS_DEMO_ENV,
  ]);
  const [ports, setPorts] = useState<ContainerPort[]>(() => [
    ...CANVAS_PREVIEW_SETTINGS_DEMO_PORTS,
  ]);
  const [cpuCores, setCpuCores] = useState(cpuInit);
  const [memoryMib, setMemoryMib] = useState(memInit);
  const [replicas, setReplicas] = useState(
    typeof states?.replicas === "number" && Number.isFinite(states.replicas)
      ? Math.min(20, Math.max(1, Math.round(states.replicas)))
      : 2
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <ContainerSettingsPane
        className="gap-4"
        cpuQuota={{
          max: 8,
          min: 0.25,
          onValueChange: setCpuCores,
          step: 0.25,
          value: cpuCores,
        }}
        env={env}
        image={image}
        memoryQuota={{
          max: 4096,
          min: 512,
          onValueChange: setMemoryMib,
          step: 128,
          value: memoryMib,
        }}
        onEnvChange={setEnv}
        onImageChange={setImage}
        onPortsChange={setPorts}
        ports={ports}
        replicasQuota={{
          max: 20,
          min: 1,
          onValueChange: setReplicas,
          step: 1,
          value: replicas,
        }}
      />
    </div>
  );
}

/** Mocked log stream shared with the Log Viewer registry preview. */
function CanvasPreviewContainerLogViewerTab() {
  const [logs] = useState(() => buildMockLogs(Date.now()));
  const [timeRange, setTimeRange] = useState<TimeRange>({
    mode: "quick",
    ms: LOG_VIEWER_PREVIEW_QUICK_RANGE_MS,
  });
  return (
    <LogViewer.Variant0
      className="h-full min-h-0 min-w-0 flex-1"
      logs={logs}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
    />
  );
}

/** AP orphaned snapshot ConfigMaps (+ active backup row), aligned with composition backup model. */
function CanvasPreviewContainerHistoryTab({ node }: CanvasPanelBodyProps) {
  const states = canvasPreviewStatesFromNode(node);
  const workloadName =
    states?.name != null && states.name !== ""
      ? states.name
      : "preview-workload";
  const rows = useMemo(
    () => mockApConfigSnapshotRows(workloadName),
    [workloadName]
  );

  return (
    <div className="min-h-0 flex-1 overflow-hidden p-2">
      <ContainerHistoryPane
        className="h-full min-h-0"
        rows={rows}
        showSnapshotExplainerAlert
        workloadName={workloadName}
      />
    </div>
  );
}

const CANVAS_PREVIEW_CONTAINER_PANEL_TABS: CanvasPanelTab[] = [
  {
    name: "Settings",
    render: ({ node }) => (
      <CanvasPreviewContainerSettingsTab key={node.id} node={node} />
    ),
  },
  {
    name: "Metrics",
    render: () => (
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <MetricsPane data={CANVAS_PREVIEW_METRICS_DATA} />
      </div>
    ),
  },
  {
    name: "Logs",
    component: <CanvasPreviewContainerLogViewerTab />,
  },
  {
    name: "History",
    render: ({ node }) => (
      <CanvasPreviewContainerHistoryTab key={node.id} node={node} />
    ),
  },
];

const PreviewCanvasContainerNode = memo(function PreviewCanvasContainerNode({
  data,
  dragging,
  selected,
}: NodeProps<Node<CanvasContainerNodeData, "containerNode">>) {
  return (
    <ContainerNode.Root
      defaultExpanded={data.defaultExpanded}
      interaction={{ dragging, selected }}
      lifecycleActions={{
        delete: { disabled: true },
        restart: { disabled: true },
        start: { disabled: true },
        stop: { disabled: true },
      }}
      quickActions={{
        calendar: { disabled: true },
        console: { disabled: true },
        logs: { disabled: true },
        metrics: { disabled: true },
      }}
      states={data.states}
    >
      <ContainerNode.Content />
    </ContainerNode.Root>
  );
});

PreviewCanvasContainerNode.displayName = "PreviewCanvasContainerNode";

const containerCanvasStatesPrimary: ContainerNodeStates = {
  image: "registry.example.io/demo:v2",
  kind: "AP",
  metrics: {
    cpu: 42,
    memory: 58,
  },
  name: "workload-demo-001",
  replicas: 3,
  status: { label: "Running", tone: "running" },
  uid: "preview-uid-primary",
};

const containerCanvasStatesSecondary: ContainerNodeStates = {
  image: "registry.example.io/other:v5",
  kind: "AP",
  metrics: {
    cpu: 18,
    memory: 31,
  },
  name: "workload-demo-002",
  replicas: 1,
  status: { label: "Synced", tone: "running" },
  uid: "preview-uid-secondary",
};

/** Frozen graph preview data (mirrors `useProjectServices` canvas output without fetch). */
const CANVAS_PREVIEW_GRAPH_NODES: Node<
  CanvasContainerNodeData,
  "containerNode"
>[] = [
  {
    data: { defaultExpanded: true, states: containerCanvasStatesPrimary },
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

/** Local-only selection logic (production uses URL + `useCanvasMeta`). */
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
      panelTabs: {
        containerNode: CANVAS_PREVIEW_CONTAINER_PANEL_TABS,
      },
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
