"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasPanel } from "./canvas.panel";
import { CanvasProvider } from "./canvas.provider";
import type { CanvasActions, CanvasReactFlowProps } from "./canvas.types";
import {
  CanvasUpperRight,
  CanvasUpperRightAnchor,
  CanvasUpperRightProvider,
} from "./canvas.upper-right";
import { useCanvas } from "./canvas.use";

export interface CanvasFlowProps {
  children?: ReactNode;
}

export interface CanvasRootProps {
  actions?: Partial<CanvasActions>;
  children?: ReactNode;
  meta?: Parameters<typeof CanvasProvider>[0]["meta"];
  state: Parameters<typeof CanvasProvider>[0]["state"];
}

const CANVAS_DEFAULT_EDGE_STYLE = {
  stroke: "var(--color-blue-400)",
  strokeDasharray: "6 6",
};

function mergeNodes(prev: Node[], next: Node[]): Node[] {
  const prevById = new Map(prev.map((n) => [n.id, n]));
  const merged = next.map((incoming) => {
    const existing = prevById.get(incoming.id);
    if (existing) {
      return { ...incoming, position: existing.position };
    }
    return incoming;
  });
  return merged;
}

function CanvasFlow({ children }: CanvasFlowProps) {
  const { meta, state } = useCanvas();
  const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    if (initializedRef.current) {
      setNodes((prev) => mergeNodes(prev, state.nodes));
    } else {
      initializedRef.current = true;
      setNodes(state.nodes);
    }
  }, [setNodes, state.nodes]);

  useLayoutEffect(() => {
    setEdges(state.edges);
  }, [setEdges, state.edges]);

  const edgesWithSelectionStyle = useMemo((): Edge[] => {
    const selected = state.selectedEdge;
    if (selected == null) {
      return edges;
    }
    return edges.map((edge) => {
      if (edge.id !== selected.id) {
        return edge;
      }
      const prev =
        edge.style && typeof edge.style === "object" ? edge.style : {};
      return {
        ...edge,
        style: {
          ...CANVAS_DEFAULT_EDGE_STYLE,
          ...prev,
          stroke: CANVAS_DEFAULT_EDGE_STYLE.stroke,
        },
      };
    });
  }, [edges, state.selectedEdge]);

  const userDefaultEdgeOptions = meta.reactFlowProps?.defaultEdgeOptions;
  const userConnectionLineStyle = meta.reactFlowProps?.connectionLineStyle;
  const passThrough: CanvasReactFlowProps = {
    fitView: true,
    connectionMode: ConnectionMode.Loose,
    maxZoom: 1.2,
    minZoom: 0.2,
    panOnDrag: true,
    panOnScroll: true,
    proOptions: { hideAttribution: true },
    selectNodesOnDrag: false,
    ...meta.reactFlowProps,
    connectionLineStyle: {
      ...CANVAS_DEFAULT_EDGE_STYLE,
      ...(userConnectionLineStyle ?? {}),
    },
    defaultEdgeOptions: {
      ...userDefaultEdgeOptions,
      style: {
        ...CANVAS_DEFAULT_EDGE_STYLE,
        ...(userDefaultEdgeOptions?.style ?? {}),
      },
    },
  };

  return (
    <CanvasUpperRightProvider>
      <div className="relative h-full min-h-0 w-full min-w-0">
        <CanvasUpperRightAnchor />
        <div className="canvas-surface">
          <ReactFlow
            {...passThrough}
            edges={edgesWithSelectionStyle}
            edgeTypes={meta.edgeTypes}
            nodes={nodes}
            nodeTypes={meta.nodeTypes}
            onEdgesChange={onEdgesChange}
            onNodesChange={onNodesChange}
          >
            <Background
              color="var(--color-canvas-dot)"
              gap={[32, 41]}
              size={1}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
        </div>
        {children}
      </div>
    </CanvasUpperRightProvider>
  );
}

function CanvasRoot({ actions, children, meta, state }: CanvasRootProps) {
  return (
    <CanvasProvider actions={actions} meta={meta} state={state}>
      {children}
    </CanvasProvider>
  );
}

function CanvasSurface({ children }: CanvasFlowProps) {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <ReactFlowProvider>
        <CanvasFlow>{children}</CanvasFlow>
      </ReactFlowProvider>
    </div>
  );
}

export const Canvas = Object.assign(CanvasSurface, {
  Flow: CanvasSurface,
  Panel: CanvasPanel,
  Root: CanvasRoot,
  UpperRight: CanvasUpperRight,
});

export type CanvasProps = CanvasRootProps;
