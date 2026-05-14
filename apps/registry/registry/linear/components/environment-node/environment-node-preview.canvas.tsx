"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type { CanvasMeta } from "@workspace/ui/components/canvas/canvas.types";
import type {
  EnvironmentNodeLifecycleActions,
  EnvironmentNodeQuickActions,
  EnvironmentNodeStates,
} from "@workspace/ui/components/environment-node/environment-node";
import { EnvironmentNode } from "@workspace/ui/components/environment-node/environment-node";
import type { Edge, Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo, useMemo } from "react";

interface CanvasEnvironmentNodeData extends Record<string, unknown> {
  defaultExpanded: boolean;
  launchCommand: string;
  states: EnvironmentNodeStates;
}

const PREVIEW_LIFECYCLE_ACTIONS = {
  delete: { onClick: () => undefined },
  restart: { onClick: () => undefined },
  start: { onClick: () => undefined },
  stop: { onClick: () => undefined },
} as const satisfies EnvironmentNodeLifecycleActions;

const PREVIEW_QUICK_ACTIONS = {
  ide: { onClick: () => undefined },
  logs: { onClick: () => undefined },
  metrics: { onClick: () => undefined },
  terminal: { onClick: () => undefined },
} as const satisfies EnvironmentNodeQuickActions;

const PreviewCanvasEnvironmentNode = memo(
  function PreviewCanvasEnvironmentNode({
    data,
    dragging,
    selected,
  }: NodeProps<Node<CanvasEnvironmentNodeData, "environmentNode">>) {
    return (
      <EnvironmentNode.Root
        defaultExpanded={data.defaultExpanded}
        interaction={{ dragging, selected }}
        launchCommand={data.launchCommand}
        lifecycleActions={PREVIEW_LIFECYCLE_ACTIONS}
        quickActions={PREVIEW_QUICK_ACTIONS}
        states={data.states}
      >
        <EnvironmentNode.Content />
      </EnvironmentNode.Root>
    );
  }
);

PreviewCanvasEnvironmentNode.displayName = "PreviewCanvasEnvironmentNode";

const states: EnvironmentNodeStates = {
  displayRuntime: "Node.js",
  formattedVersion: "20",
  metrics: {
    cpu: 24,
    memory: 42,
    storage: 31,
  },
  name: "alice-devbox",
  runtimeKey: "nodejs",
  status: { label: "Running", tone: "running" },
};

const launchCommand = "pnpm dev --host 0.0.0.0 --port 3000";

const ENVIRONMENT_NODE_CANVAS_NODES: Node<
  CanvasEnvironmentNodeData,
  "environmentNode"
>[] = [
  {
    data: { defaultExpanded: false, launchCommand, states },
    id: "environment-node-collapsed",
    position: { x: 170, y: 120 },
    type: "environmentNode",
  },
  {
    data: { defaultExpanded: true, launchCommand, states },
    id: "environment-node-expanded",
    position: { x: 540, y: 104 },
    type: "environmentNode",
  },
];

const ENVIRONMENT_NODE_CANVAS_EDGES: Edge[] = [];

const ENVIRONMENT_NODE_CANVAS_NODE_TYPES = {
  environmentNode: PreviewCanvasEnvironmentNode,
} as const satisfies NodeTypes;

export function EnvironmentNodeCanvasHero() {
  const canvasMeta = useMemo(
    (): CanvasMeta => ({
      nodeTypes: ENVIRONMENT_NODE_CANVAS_NODE_TYPES,
      reactFlowProps: {
        fitViewOptions: { padding: 0.35 },
      },
    }),
    []
  );

  const canvasState = useMemo(
    () => ({
      edges: ENVIRONMENT_NODE_CANVAS_EDGES,
      nodes: ENVIRONMENT_NODE_CANVAS_NODES,
      selectedEdge: null,
      selectedNode: null,
    }),
    []
  );

  return (
    <div className="relative size-full overflow-hidden rounded-xl border border-border">
      <Canvas.Root meta={canvasMeta} state={canvasState}>
        <Canvas.Flow />
      </Canvas.Root>
    </div>
  );
}
