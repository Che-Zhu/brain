"use client";

import type { EntryNodeStates } from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";
import { useState } from "react";

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

export default function EntryNodePreview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Default unhealthy">
        <PreviewSurface>
          <BadgeRow states={unhealthy} />
        </PreviewSurface>
      </Preview>
      <Preview title="Hover with expand">
        <PreviewSurface>
          <EntryNode.Root
            actions={{ onExpand: () => setExpanded(true) }}
            states={unhealthy}
          >
            <div className="flex items-start gap-1.5">
              <EntryNode.CollapsedBadge />
              <EntryNode.ExpandButton />
            </div>
          </EntryNode.Root>
        </PreviewSurface>
        <p className="text-muted-foreground text-xs">
          Expanded:{" "}
          <span className="font-mono text-foreground">{String(expanded)}</span>
        </p>
      </Preview>
      <Preview title="When drag">
        <PreviewSurface>
          <EntryNode.Root states={unhealthy}>
            <EntryNode.CollapsedBadge dragging />
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
