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
import { memo, useEffect, useMemo, useRef, useState } from "react";

interface CanvasEntryNodeData extends Record<string, unknown> {
  domains: EntryNodeDomains;
  states: EntryNodeStates;
}

function unwrapDragAngle(angle: number, previousAngle: number | undefined) {
  if (previousAngle === undefined) {
    return angle;
  }

  let nextAngle = angle;

  while (nextAngle - previousAngle > 180) {
    nextAngle -= 360;
  }

  while (nextAngle - previousAngle < -180) {
    nextAngle += 360;
  }

  return nextAngle;
}

const PreviewCanvasEntryNode = memo(function PreviewCanvasEntryNode({
  data,
  dragging,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<Node<CanvasEntryNodeData, "entryNode">>) {
  const previousPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [dragAngle, setDragAngle] = useState<number>();

  useEffect(() => {
    if (!dragging) {
      previousPositionRef.current = null;
      setDragAngle(undefined);
      return;
    }

    const currentPosition = { x: positionAbsoluteX, y: positionAbsoluteY };
    const previousPosition = previousPositionRef.current;
    previousPositionRef.current = currentPosition;

    if (!previousPosition) {
      return;
    }

    const deltaX = currentPosition.x - previousPosition.x;
    const deltaY = currentPosition.y - previousPosition.y;

    if (Math.hypot(deltaX, deltaY) < 1) {
      return;
    }

    const nextAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    setDragAngle((previousAngle) => unwrapDragAngle(nextAngle, previousAngle));
  }, [dragging, positionAbsoluteX, positionAbsoluteY]);

  return (
    <EntryNode
      state={{
        domains: data.domains,
        interaction: { dragAngle, dragging },
        states: data.states,
      }}
    />
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
