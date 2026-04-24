"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { CanvasErrorFallback } from "@workspace/ui/components/canvas/canvas-error-fallback";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";

export default function CanvasPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="Workspace canvas">
        <div className="relative h-[min(480px,70vh)] min-h-0 w-full min-w-0 overflow-hidden rounded-lg border border-border">
          <Canvas projectId="preview" />
        </div>
      </Preview>
      <Preview showReset={false} title="Route error fallback">
        <div className="rounded-lg border border-border border-dashed">
          <CanvasErrorFallback
            className="min-h-[200px]"
            error={Object.assign(new Error("Example failure message"), {
              digest: "preview",
            })}
            reset={() => undefined}
          />
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
