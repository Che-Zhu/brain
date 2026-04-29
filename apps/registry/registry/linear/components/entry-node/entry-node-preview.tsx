"use client";

import type { EntryNodeStates } from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";

const unhealthy: EntryNodeStates = {
  name: "Placeholder",
  status: { label: "Unhealthy" },
};

const statusSamples: EntryNodeStates[] = [
  {
    name: "Running",
    status: { label: "Running", tone: "running" },
  },
  {
    name: "Deleting",
    status: { label: "Deleting", tone: "deleting" },
  },
  {
    name: "Stopping",
    status: { label: "Stopping", tone: "stopping" },
  },
  {
    name: "Stopped",
    status: { label: "Stopped", tone: "stopped" },
  },
  {
    name: "Accessible",
    status: { label: "Accessible", tone: "accessible" },
  },
  {
    name: "Pending",
    status: { label: "Pending", tone: "pending" },
  },
];

function PreviewSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center bg-canvas-surface p-6">
      {children}
    </div>
  );
}

function BadgeRow({ states }: { states: EntryNodeStates }) {
  return (
    <EntryNode.Root states={states}>
      <EntryNode.CollapsedBadge />
    </EntryNode.Root>
  );
}

function DragSample({ angle, label }: { angle: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <EntryNode.CollapsedBadge dragAngle={angle} />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

export default function EntryNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Default unhealthy">
        <PreviewSurface>
          <BadgeRow states={unhealthy} />
        </PreviewSurface>
      </Preview>
      <Preview title="When drag">
        <PreviewSurface>
          <EntryNode.Root states={unhealthy}>
            <EntryNode.CollapsedBadge dragAngle={0} dragging />
          </EntryNode.Root>
        </PreviewSurface>
      </Preview>
      <Preview className="lg:col-span-2" title="Drag direction strokes">
        <PreviewSurface>
          <EntryNode.Root states={unhealthy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DragSample angle={0} label="right" />
              <DragSample angle={90} label="down" />
              <DragSample angle={180} label="left" />
              <DragSample angle={-90} label="up" />
            </div>
          </EntryNode.Root>
        </PreviewSurface>
      </Preview>
      <Preview title="Long name truncation">
        <PreviewSurface>
          <EntryNode.Root
            states={{
              name: "orders-public-domain-with-a-very-long-entry-node-name",
              status: { label: "Accessible" },
            }}
          >
            <EntryNode.CollapsedBadge />
          </EntryNode.Root>
        </PreviewSurface>
      </Preview>
      <Preview className="lg:col-span-2" title="Status colours">
        <PreviewSurface>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statusSamples.map((states) => (
              <BadgeRow key={states.name} states={states} />
            ))}
          </div>
        </PreviewSurface>
      </Preview>
    </PreviewWrapper>
  );
}
