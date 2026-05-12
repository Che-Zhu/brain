import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/v1/container-node";
import type { Node } from "@xyflow/react";

// `Node`'s second type parameter must match `CANVAS_CONTAINER_NODE_TYPE` in ./constants.
// biome-ignore lint/style/useImportType: value required for `typeof` in `CanvasContainerRfNode`
import { CANVAS_CONTAINER_NODE_TYPE } from "./constants";

export interface CanvasContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  states: ContainerNodeStates;
}

export type CanvasContainerRfNode = Node<
  CanvasContainerNodeData,
  typeof CANVAS_CONTAINER_NODE_TYPE
>;
