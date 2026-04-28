"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import type { EntryNodeStates } from "@workspace/ui/components/entry-node/entry-node";
import { EntryNode } from "@workspace/ui/components/entry-node/entry-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo } from "react";

interface CanvasContainerNodeData extends Record<string, unknown> {
  states: ContainerNodeStates;
}

interface CanvasEntryNodeData extends Record<string, unknown> {
  states: EntryNodeStates;
}

const CanvasContainerNode = memo(function CanvasContainerNode({
  data,
}: NodeProps<Node<CanvasContainerNodeData, "containerNode">>) {
  return (
    <ContainerNode.Root states={data.states}>
      <ContainerNode.Variant0 className="min-h-40 w-56 max-w-[min(100%,16rem)]" />
    </ContainerNode.Root>
  );
});

const CanvasEntryNode = memo(function CanvasEntryNode({
  data,
  dragging,
}: NodeProps<Node<CanvasEntryNodeData, "entryNode">>) {
  return (
    <EntryNode.Root states={data.states}>
      <div className="flex items-start gap-1.5">
        <EntryNode.CollapsedBadge dragging={dragging} />
        <EntryNode.ExpandButton />
      </div>
    </EntryNode.Root>
  );
});

const containerCanvasStates: ContainerNodeStates = {
  cpuPercent: 42,
  image: "registry.example.io/demo:v2",
  kind: "Container",
  memoryPercent: 58,
  name: "workload-demo-001",
  replicas: 3,
  status: { label: "Running", tone: "running" },
};

const entryCanvasStates: EntryNodeStates = {
  name: "orders.demo.sealos.run",
  status: { label: "Unhealthy" },
};

const canvasPreviewNodes: (
  | Node<CanvasContainerNodeData, "containerNode">
  | Node<CanvasEntryNodeData, "entryNode">
)[] = [
  {
    data: { states: containerCanvasStates },
    id: "container-1",
    position: { x: 72, y: 56 },
    type: "containerNode",
  },
  {
    data: { states: entryCanvasStates },
    id: "entry-1",
    position: { x: 380, y: 92 },
    type: "entryNode",
  },
];

const canvasPreviewNodeTypes: NodeTypes = {
  containerNode: CanvasContainerNode,
  entryNode: CanvasEntryNode,
};

const canvasPreviewState = {
  edges: [],
  nodes: canvasPreviewNodes,
};

const canvasPreviewMeta = {
  nodeTypes: canvasPreviewNodeTypes,
};

export default function CanvasPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        className="h-[min(480px,70vh)]"
        showMaximize
        title="Workspace canvas"
      >
        <div className="relative size-full overflow-hidden rounded-xl border border-border">
          <Canvas.Root meta={canvasPreviewMeta} state={canvasPreviewState}>
            <Canvas.Flow />
          </Canvas.Root>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
