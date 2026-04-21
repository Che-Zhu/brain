"use client";

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

/** Register on nodes as `type: PROJECT_FLOW_NODE_TYPE_CONTAINER`. */
export const PROJECT_FLOW_NODE_TYPE_CONTAINER = "containerNode" as const;

export interface ProjectFlowContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  states: ContainerNodeStates;
}

export type ProjectFlowContainerRfNode = Node<
  ProjectFlowContainerNodeData,
  typeof PROJECT_FLOW_NODE_TYPE_CONTAINER
>;

function ProjectFlowContainerNode({
  data,
}: NodeProps<ProjectFlowContainerRfNode>) {
  const { actions = {}, states } = data;
  return (
    <>
      <Handle position={Position.Top} type="target" />
      <ContainerNode.Root actions={actions} states={states}>
        <ContainerNode.Variant0 className="h-40 w-60" />
      </ContainerNode.Root>
      <Handle position={Position.Bottom} type="source" />
    </>
  );
}

ProjectFlowContainerNode.displayName = "ProjectFlow.ContainerNode";

/** Default React Flow `nodeTypes` including the container workload card. */
export const PROJECT_FLOW_DEFAULT_NODE_TYPES = {
  [PROJECT_FLOW_NODE_TYPE_CONTAINER]: ProjectFlowContainerNode,
} as const satisfies NodeTypes;

export { ProjectFlowContainerNode };
