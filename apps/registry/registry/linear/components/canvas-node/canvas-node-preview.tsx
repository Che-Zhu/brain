"use client";

import type { CanvasNodeStatus } from "@workspace/ui/components/canvas-node/canvas-node";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { Activity, Server } from "lucide-react";
import type { ReactNode } from "react";

const visualStatusSamples = [
  { label: "Running", visualTone: "positive" },
  { label: "Pending", visualTone: "progress" },
  { label: "Deleting", visualTone: "warning" },
  { label: "Failed", visualTone: "negative" },
  { label: "Not configured", visualTone: "neutral" },
] as const satisfies readonly CanvasNodeStatus[];

const fallbackStatusSamples = [
  undefined,
  { label: "" },
] as const satisfies readonly (CanvasNodeStatus | undefined)[];

function PreviewSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-52 items-center justify-center bg-canvas-surface p-6">
      {children}
    </div>
  );
}

function StatusMatrixRow({ status }: { status?: CanvasNodeStatus }) {
  const label = status?.label?.trim() || "Unknown";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(7rem,1fr)_2.5rem_minmax(9rem,1fr)_minmax(8rem,1fr)] items-center gap-3 rounded-lg bg-zinc-950/20 p-3 text-xs">
      <span className="min-w-0 truncate text-zinc-50">{label}</span>
      <CanvasNode.Status status={status} />
      <CanvasNode.StatusPill status={status} />
      <CanvasNode.FooterStatus status={status} />
    </div>
  );
}

function CanvasNodeSample({ status }: { status: CanvasNodeStatus }) {
  return (
    <CanvasNode.Root defaultExpanded>
      <CanvasNode.Card>
        <CanvasNode.Header>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Server aria-hidden className="size-4 text-zinc-50" />
              </span>
              <span className="min-w-0 truncate font-normal text-sm text-zinc-50 leading-5">
                visual-status-node
              </span>
            </span>
            <CanvasNode.Status status={status} />
          </div>
        </CanvasNode.Header>
        <CanvasNode.Body>
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-zinc-950/20 p-2.5">
            <CanvasNode.StatusPill status={status} />
            <CanvasNode.StatusDot status={status} />
          </div>
        </CanvasNode.Body>
        <CanvasNode.Footer>
          <CanvasNode.FooterStatus status={status} />
          <CanvasNode.Metrics>
            <CanvasNode.Metric label="Active" value="3">
              <Activity aria-hidden className="size-3.5 shrink-0" />
            </CanvasNode.Metric>
          </CanvasNode.Metrics>
        </CanvasNode.Footer>
      </CanvasNode.Card>
    </CanvasNode.Root>
  );
}

export default function CanvasNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview className="lg:col-span-2" title="Visual status matrix">
        <PreviewSurface>
          <div className="grid w-full max-w-3xl gap-2">
            {visualStatusSamples.map((status) => (
              <StatusMatrixRow key={status.visualTone} status={status} />
            ))}
          </div>
        </PreviewSurface>
      </Preview>
      <Preview title="Expanded status">
        <PreviewSurface>
          <CanvasNodeSample status={visualStatusSamples[0]} />
        </PreviewSurface>
      </Preview>
      <Preview title="Fallback status">
        <PreviewSurface>
          <div className="grid w-full max-w-xl gap-2">
            {fallbackStatusSamples.map((status, index) => (
              <StatusMatrixRow
                key={status?.label ?? `fallback-${index}`}
                status={status}
              />
            ))}
          </div>
        </PreviewSurface>
      </Preview>
    </PreviewWrapper>
  );
}
