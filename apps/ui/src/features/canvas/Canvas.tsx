"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { Provider as JotaiProvider } from "jotai";
import { CanvasProvider } from "./Canvas.Provider";

export function Canvas({ projectId }: { projectId: string }) {
  return (
    <JotaiProvider>
      <ReactFlowProvider>
        <CanvasProvider projectId={projectId}>
          <ReactFlow edges={[]} fitView nodes={[]} />
        </CanvasProvider>
      </ReactFlowProvider>
    </JotaiProvider>
  );
}
