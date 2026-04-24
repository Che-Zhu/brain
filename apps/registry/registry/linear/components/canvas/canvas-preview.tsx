"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo } from "react";

interface CanvasContainerNodeData extends Record<string, unknown> {
  states: ContainerNodeStates;
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

const containerCanvasStates: ContainerNodeStates = {
  cpuPercent: 42,
  image: "registry.example.io/demo:v2",
  kind: "Container",
  memoryPercent: 58,
  name: "workload-demo-001",
  replicas: 3,
  status: { label: "Running", tone: "running" },
};

const canvasPreviewNodes: Node<CanvasContainerNodeData, "containerNode">[] = [
  {
    data: { states: containerCanvasStates },
    id: "container-1",
    position: { x: 72, y: 56 },
    type: "containerNode",
  },
];

const canvasPreviewNodeTypes: NodeTypes = {
  containerNode: CanvasContainerNode,
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
