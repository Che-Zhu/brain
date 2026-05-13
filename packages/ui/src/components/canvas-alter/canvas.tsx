"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type OnConnect,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Provider as JotaiProvider } from "jotai";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { CanvasProvider } from "./canvas.provider";
import type { CanvasReactFlowProps } from "./canvas.types";
import { useCanvas } from "./canvas.use";

export interface CanvasFlowProps {
  children?: ReactNode;
}

export interface CanvasRootProps {
  children?: ReactNode;
  meta?: Parameters<typeof CanvasProvider>[0]["meta"];
  state: Parameters<typeof CanvasProvider>[0]["state"];
}

function CanvasFlow({ children }: CanvasFlowProps) {
  const { meta, state } = useCanvas();
  const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges);
  const onConnect = meta.reactFlowProps?.onConnect;

  useEffect(() => {
    setNodes(state.nodes);
  }, [setNodes, state.nodes]);

  useEffect(() => {
    setEdges(state.edges);
  }, [setEdges, state.edges]);

  const passThrough: CanvasReactFlowProps = {
    fitView: true,
    maxZoom: 1.2,
    minZoom: 0.2,
    panOnDrag: true,
    panOnScroll: true,
    proOptions: { hideAttribution: true },
    selectNodesOnDrag: false,
    ...meta.reactFlowProps,
  };

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      setEdges((currentEdges) => addEdge(connection, currentEdges));
      onConnect?.(connection);
    },
    [onConnect, setEdges]
  );

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      <div className="canvas-surface">
        <ReactFlow
          {...passThrough}
          edges={edges}
          edgeTypes={meta.edgeTypes}
          nodes={nodes}
          nodeTypes={meta.nodeTypes}
          onConnect={handleConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
        >
          <Background
            color="var(--color-canvas-dot)"
            gap={[32, 41]}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          {children}
        </ReactFlow>
      </div>
    </div>
  );
}

function CanvasRoot({ children, meta, state }: CanvasRootProps) {
  return (
    <CanvasProvider meta={meta} state={state}>
      {children}
    </CanvasProvider>
  );
}

function CanvasSurface({ children }: CanvasFlowProps) {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <JotaiProvider>
        <ReactFlowProvider>
          <CanvasFlow>{children}</CanvasFlow>
        </ReactFlowProvider>
      </JotaiProvider>
    </div>
  );
}

export const Canvas = Object.assign(CanvasSurface, {
  Flow: CanvasSurface,
  Root: CanvasRoot,
});

export type CanvasProps = CanvasRootProps;
