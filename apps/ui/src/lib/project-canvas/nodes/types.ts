import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/container-node";
import type {
  DatabaseNodeActions,
  DatabaseNodeConnection,
  DatabaseNodeStates,
} from "@workspace/ui/components/database-node/database-node";
import type {
  EntryNodeAccessDomain,
  EntryNodeActions,
  EntryNodeStates,
  EntryNodeTarget,
} from "@workspace/ui/components/entry-node/entry-node";
import type { Node } from "@xyflow/react";

// `Node`'s second type parameter must match the node type constants in ./constants.
// biome-ignore lint/style/useImportType: value required for `typeof` in `CanvasContainerRfNode`
import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "./constants";

export interface CanvasContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  onWorkloadMutation?: () => Promise<unknown>;
  states: ContainerNodeStates;
}

export type CanvasContainerRfNode = Node<
  CanvasContainerNodeData,
  typeof CANVAS_CONTAINER_NODE_TYPE
>;

export interface CanvasDatabaseWorkloadRef {
  name: string;
  namespace: string;
}

export interface CanvasDatabaseNodeData extends Record<string, unknown> {
  actions?: DatabaseNodeActions;
  connections: DatabaseNodeConnection[];
  states: DatabaseNodeStates;
  uid?: string;
  workload: CanvasDatabaseWorkloadRef;
}

export type CanvasDatabaseRfNode = Node<
  CanvasDatabaseNodeData,
  typeof CANVAS_DATABASE_NODE_TYPE
>;

export interface CanvasEntryNodeData extends Record<string, unknown> {
  accessDomain?: EntryNodeAccessDomain;
  actions?: EntryNodeActions;
  states: EntryNodeStates;
  targets: EntryNodeTarget[];
}

export type CanvasEntryRfNode = Node<
  CanvasEntryNodeData,
  typeof CANVAS_ENTRY_NODE_TYPE
>;
