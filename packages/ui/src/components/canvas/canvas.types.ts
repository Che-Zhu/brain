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

/** Host-controlled panel tab selection (typically backed by `nuqs` in the Next app). */
export interface CanvasPanelTabSync {
  /** Persist tab changes (`useQueryState` setter or equivalent). */
  setTabValue: (value: string) => unknown;
  /** Current Radix Tabs value — equals the active tab's {@link CanvasPanelTab.name}. */
  tabValue: string;
}

/**
 * One tab in {@link CanvasMeta.panelTabs}.
 * Tab `name` doubles as the Radix value and URL query param — must be unique within a list.
 */
export type CanvasPanelTab =
  | {
      name: string;
      component: ReactNode;
      render?: never;
    }
  | {
      name: string;
      component?: never;
      render: (panel: CanvasPanelBodyProps) => ReactNode;
    };

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
  selectedEdge: Edge | null;
  selectedNode: Node | null;
}

export type CanvasSelectedNode = CanvasState["selectedNode"];
export type CanvasSelectedEdge = CanvasState["selectedEdge"];

export interface CanvasActions {
  fitView: () => void;
  onPanelClose: () => void;
}

export interface CanvasMeta {
  edgeTypes?: EdgeTypes;
  nodeTypes?: NodeTypes;
  /**
   * Syncs multi-tab panels to host state / URL (typically backed by `nuqs`).
   * Omit for uncontrolled default tab (first tab's `name`).
   */
  panelTabSync?: CanvasPanelTabSync;
  /**
   * Tabbed panel bodies per node `type`. When the selected type entry is non-empty, it replaces
   * {@link CanvasMeta.panelTypes} for that type (Vercel-style tabs in {@link CanvasPanel}).
   */
  panelTabs?: Partial<Record<string, CanvasPanelTab[]>>;
  panelTypes?: CanvasPanelTypes;
  reactFlowProps?: CanvasReactFlowProps;
}

export interface CanvasContextValue {
  actions: CanvasActions;
  meta: CanvasMeta;
  state: CanvasState;
}

export interface CanvasPanelProps {
  children?: ReactNode;
  className?: string;
}
