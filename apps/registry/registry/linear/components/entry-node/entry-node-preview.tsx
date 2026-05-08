"use client";

import type {
  EntryNodeDomains,
  EntryNodeStates,
} from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";

const accessible: EntryNodeStates = {
  name: "orders.demo.sealos.run",
  status: { label: "Accessible", tone: "accessible" },
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

const defaultDomains: EntryNodeDomains = {
  access: {
    label: "Access domain",
    status: { label: "Accessible", tone: "accessible" },
    value: "orders.demo.sealos.run",
  },
  private: {
    label: "Private domain",
    status: { label: "Accessible", tone: "accessible" },
    value: "orders.demo.sealos.run",
  },
  public: {
    label: "Public domain",
    status: { label: "Accessible", tone: "accessible" },
    value: "orders.demo.sealos.run",
  },
};

function PreviewSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center bg-canvas-surface p-6">
      {children}
    </div>
  );
}

function EntryNodeSample({
  defaultExpanded = false,
  dragging,
  selected,
  states,
}: {
  defaultExpanded?: boolean;
  dragging?: boolean;
  selected?: boolean;
  states: EntryNodeStates;
}) {
  return (
    <EntryNode.Root
      defaultExpanded={defaultExpanded}
      domains={defaultDomains}
      interaction={{ dragging, selected }}
      states={states}
    >
      <EntryNode.Content />
    </EntryNode.Root>
  );
}

function DragSample() {
  return (
    <div className="flex flex-col items-center gap-2">
      <EntryNodeSample dragging states={accessible} />
      <span className="text-muted-foreground text-xs">fixed stroke</span>
    </div>
  );
}

export default function EntryNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Collapsed card">
        <PreviewSurface>
          <EntryNodeSample states={accessible} />
        </PreviewSurface>
      </Preview>
      <Preview title="Selected card">
        <PreviewSurface>
          <EntryNodeSample selected states={accessible} />
        </PreviewSurface>
      </Preview>
      <Preview title="Expanded card">
        <PreviewSurface>
          <EntryNodeSample defaultExpanded states={accessible} />
        </PreviewSurface>
      </Preview>
      <Preview className="lg:col-span-2" title="Drag stroke">
        <PreviewSurface>
          <DragSample />
        </PreviewSurface>
      </Preview>
      <Preview title="Long name truncation">
        <PreviewSurface>
          <EntryNodeSample
            states={{
              name: "orders-public-domain-with-a-very-long-entry-node-name",
              status: { label: "Accessible", tone: "accessible" },
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview className="lg:col-span-2" title="Status colours">
        <PreviewSurface>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statusSamples.map((states) => (
              <EntryNodeSample key={states.name} states={states} />
            ))}
          </div>
        </PreviewSurface>
      </Preview>
    </PreviewWrapper>
  );
}
