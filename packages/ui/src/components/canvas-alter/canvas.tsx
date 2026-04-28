"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Provider as JotaiProvider } from "jotai";
import type { ReactNode } from "react";
import { useEffect } from "react";
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
    snapGrid: [20, 20],
    snapToGrid: true,
    ...meta.reactFlowProps,
  };

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      <div className="canvas-surface">
        <ReactFlow
          {...passThrough}
          edges={edges}
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
