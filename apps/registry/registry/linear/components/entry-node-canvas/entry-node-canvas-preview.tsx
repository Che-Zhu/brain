"use client";

import { Canvas } from "@workspace/ui/components/canvas-alter/canvas";
import type { CanvasMeta } from "@workspace/ui/components/canvas-alter/canvas.types";
import type {
  EntryNodeDomains,
  EntryNodeStates,
} from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { Edge, Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo, useMemo } from "react";

interface CanvasEntryNodeData extends Record<string, unknown> {
  domains: EntryNodeDomains;
  states: EntryNodeStates;
}

const PreviewCanvasEntryNode = memo(function PreviewCanvasEntryNode({
  data,
  dragging,
  selected,
}: NodeProps<Node<CanvasEntryNodeData, "entryNode">>) {
  return (
    <EntryNode.Root
      domains={data.domains}
      interaction={{ dragging, selected }}
      states={data.states}
    >
      <EntryNode.Content />
    </EntryNode.Root>
  );
});

PreviewCanvasEntryNode.displayName = "PreviewCanvasEntryNode";

const entryNodeStates: EntryNodeStates = {
  name: "orders.demo.sealos.run",
  status: { label: "Accessible", tone: "accessible" },
};

const entryNodeDomains: EntryNodeDomains = {
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

const ENTRY_NODE_CANVAS_NODES: Node<CanvasEntryNodeData, "entryNode">[] = [
  {
    data: { domains: entryNodeDomains, states: entryNodeStates },
    id: "entry-node-1",
    position: { x: 220, y: 160 },
    type: "entryNode",
  },
];

const ENTRY_NODE_CANVAS_EDGES: Edge[] = [];

const ENTRY_NODE_CANVAS_NODE_TYPES = {
  entryNode: PreviewCanvasEntryNode,
} as const satisfies NodeTypes;

export default function EntryNodeCanvasPreview() {
  const canvasMeta = useMemo(
    (): CanvasMeta => ({
      nodeTypes: ENTRY_NODE_CANVAS_NODE_TYPES,
      reactFlowProps: {
        fitViewOptions: { padding: 0.45 },
      },
    }),
    []
  );

  const canvasState = useMemo(
    () => ({
      edges: ENTRY_NODE_CANVAS_EDGES,
      nodes: ENTRY_NODE_CANVAS_NODES,
    }),
    []
  );

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview className="h-96" showMaximize title="Entry node canvas">
        <div className="relative size-full overflow-hidden rounded-xl border border-border">
          <Canvas.Root meta={canvasMeta} state={canvasState}>
            <Canvas.Flow />
          </Canvas.Root>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
