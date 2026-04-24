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
import { CanvasProvider } from "./canvas-provider";

export function Canvas({ projectId }: { projectId: string }) {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <JotaiProvider>
        <ReactFlowProvider>
          <CanvasProvider projectId={projectId}>
            <div className="relative h-full min-h-0 w-full min-w-0">
              <div className="canvas-surface">
                <ReactFlow
                  edges={[]}
                  fitView
                  nodes={[]}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    color="var(--color-canvas-dot)"
                    gap={[32, 41]}
                    size={1}
                    variant={BackgroundVariant.Dots}
                  />
                </ReactFlow>
              </div>
            </div>
          </CanvasProvider>
        </ReactFlowProvider>
      </JotaiProvider>
    </div>
  );
}
