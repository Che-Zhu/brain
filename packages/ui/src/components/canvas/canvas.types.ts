import type {
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlowProps,
} from "@xyflow/react";

/** Props forwarded to `<ReactFlow />`; canvas owns nodes/edges/types/change handlers. */
export type CanvasReactFlowProps = Omit<
  ReactFlowProps<Node, Edge>,
  | "children"
  | "defaultEdges"
  | "defaultNodes"
  | "edgeTypes"
  | "edges"
  | "nodeTypes"
  | "nodes"
  | "onEdgesChange"
  | "onNodesChange"
>;

export interface CanvasState {
  edges: Edge[];
  nodes: Node[];
}

export interface CanvasActions {
  fitView: () => void;
}

export interface CanvasMeta {
  edgeTypes?: EdgeTypes;
  nodeTypes?: NodeTypes;
  reactFlowProps?: CanvasReactFlowProps;
}

export interface CanvasContextValue {
  actions: CanvasActions;
  meta: CanvasMeta;
  state: CanvasState;
}
