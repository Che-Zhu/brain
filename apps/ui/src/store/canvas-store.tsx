"use client";

import type { CanvasMeta } from "@workspace/ui/components/canvas/canvas.types";
import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import {
  Handle,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import { atom } from "jotai";
import { memo } from "react";

/** React Flow `type` for AP / workload container cards on the app canvas. */
export const CANVAS_CONTAINER_NODE_TYPE = "containerNode" as const;

export interface CanvasContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  states: ContainerNodeStates;
}

export type CanvasContainerRfNode = Node<
  CanvasContainerNodeData,
  typeof CANVAS_CONTAINER_NODE_TYPE
>;

export const CanvasContainerNode = memo(function CanvasContainerNode({
  data,
}: NodeProps<CanvasContainerRfNode>) {
  const { actions = {}, states } = data;
  return (
    <div className="h-full w-full">
      <Handle position={Position.Top} type="target" />
      <ContainerNode.Root actions={actions} states={states}>
        <ContainerNode.Variant0 className="h-40 w-60" />
      </ContainerNode.Root>
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
});

CanvasContainerNode.displayName = "CanvasContainerNode";

/** Default `meta.nodeTypes` for `Canvas.Root` in this app. */
export const canvasDefaultNodeTypes = {
  [CANVAS_CONTAINER_NODE_TYPE]: CanvasContainerNode,
} as const satisfies NodeTypes;

/** Canvas `meta` (`nodeTypes`, `edgeTypes`, `reactFlowProps`) — not fetch-derived `state`. */
export const canvasMetaAtom = atom<CanvasMeta>({
  nodeTypes: canvasDefaultNodeTypes,
});
