"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { Provider as JotaiProvider } from "jotai";
import { CanvasProvider } from "./Canvas.Provider";

export function Canvas({ projectId }: { projectId: string }) {
  return (
    <JotaiProvider>
      <ReactFlowProvider>
        <CanvasProvider projectId={projectId}>
          <div className="canvas-surface">
            <ReactFlow edges={[]} fitView nodes={[]}>
              <Background
                color="#52525b"
                gap={[32, 41]}
                size={1}
                variant={BackgroundVariant.Dots}
              />
            </ReactFlow>
          </div>
        </CanvasProvider>
      </ReactFlowProvider>
    </JotaiProvider>
  );
}
