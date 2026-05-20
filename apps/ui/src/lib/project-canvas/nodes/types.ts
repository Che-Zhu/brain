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
import type { ContainerEnvDbDsnSource } from "@workspace/ui/lib/container-env-rows";
import type { Node } from "@xyflow/react";

// `Node`'s second type parameter must match the node type constants in ./constants.
// biome-ignore lint/style/useImportType: value required for `typeof` in `CanvasContainerRfNode`
import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "./constants";

export interface CanvasNodeLayoutState {
  expanded?: boolean;
  onExpandedChange?: (node: Node, expanded: boolean) => void;
}

export interface CanvasContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  dbDsnReferenceSources?: ContainerEnvDbDsnSource[];
  layout?: CanvasNodeLayoutState;
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
  layout?: CanvasNodeLayoutState;
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
  layout?: CanvasNodeLayoutState;
  resource: {
    name: string;
    namespace: string;
    uid?: string;
  };
  states: EntryNodeStates;
  targets: EntryNodeTarget[];
}

export type CanvasEntryRfNode = Node<
  CanvasEntryNodeData,
  typeof CANVAS_ENTRY_NODE_TYPE
>;
