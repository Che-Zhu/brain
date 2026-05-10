"use client";

import { Canvas } from "@workspace/ui/components/canvas-alter/canvas";
import type { CanvasMeta } from "@workspace/ui/components/canvas-alter/canvas.types";
import type {
  EntryNodeAccessDomain,
  EntryNodeStates,
  EntryNodeTarget,
} from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { Edge, Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo, useMemo } from "react";

interface CanvasEntryNodeData extends Record<string, unknown> {
  accessDomain: EntryNodeAccessDomain;
  states: EntryNodeStates;
  targets: EntryNodeTarget[];
}

const PreviewCanvasEntryNode = memo(function PreviewCanvasEntryNode({
  data,
  dragging,
  selected,
}: NodeProps<Node<CanvasEntryNodeData, "entryNode">>) {
  return (
    <EntryNode.Root
      accessDomain={data.accessDomain}
      interaction={{ dragging, selected }}
      states={data.states}
      targets={data.targets}
    >
      <EntryNode.Content />
    </EntryNode.Root>
  );
});

PreviewCanvasEntryNode.displayName = "PreviewCanvasEntryNode";

const entryNodeStates: EntryNodeStates = {
  name: "orders.demo.sealos.run",
};

const accessDomain: EntryNodeAccessDomain = {
  value: "orders.demo.sealos.run",
};

const targets: EntryNodeTarget[] = [
  {
    id: "public",
    label: "Public Domain",
    status: { label: "Accessible", tone: "accessible" },
    value: "orders.demo.sealos.run",
  },
];

const ENTRY_NODE_CANVAS_NODES: Node<CanvasEntryNodeData, "entryNode">[] = [
  {
    data: { accessDomain, states: entryNodeStates, targets },
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
