import type {
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlowProps,
} from "@xyflow/react";
import type { ComponentType, ReactNode } from "react";

/** Body content for {@link CanvasPanel}; receives the selected React Flow node. */
export interface CanvasPanelBodyProps {
  node: Node;
}

export type CanvasPanelComponent = ComponentType<CanvasPanelBodyProps>;

/**
 * Panel body components keyed by React Flow node `type` string — use the same keys as
 * {@link CanvasMeta.nodeTypes} so selection shows the matching panel.
 */
export type CanvasPanelTypes = Partial<Record<string, CanvasPanelComponent>>;

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
  /** React Flow edge selection; `null` when no edge is selected (exclusive with `selectedNode`). */
  selectedEdge: Edge | null;
  /** React Flow selection; `null` when nothing is selected. */
  selectedNode: Node | null;
}

/** Selection slice of {@link CanvasState}. */
export type CanvasSelectedNode = CanvasState["selectedNode"];

/** Selected edge slice of {@link CanvasState}. */
export type CanvasSelectedEdge = CanvasState["selectedEdge"];

export interface CanvasActions {
  fitView: () => void;
  /** Clear side panel selection (invoke from panel close control). */
  onPanelClose: () => void;
}

export interface CanvasMeta {
  edgeTypes?: EdgeTypes;
  nodeTypes?: NodeTypes;
  panelTypes?: CanvasPanelTypes;
  reactFlowProps?: CanvasReactFlowProps;
}

export interface CanvasContextValue {
  actions: CanvasActions;
  meta: CanvasMeta;
  state: CanvasState;
}

/** Right-hand overlay when `state.selectedNode` is set; sits above the React Flow surface. */
export interface CanvasPanelProps {
  children?: ReactNode;
  className?: string;
}
