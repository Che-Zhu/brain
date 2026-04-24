import type { Connection, Edge, Node } from "@xyflow/react";

export interface ProjectFlowStates {
  initialEdges: Edge[];
  initialNodes: Node[];
  /**
   * When true (e.g. public preview): pan the canvas only; no node drag, selection,
   * connections, zoom, or pointer interaction on node chrome.
   */
  readOnly?: boolean;
}

export interface ProjectFlowActions {
  onConnect?: (connection: Connection) => void;
}

export interface ProjectFlowValue {
  actions: ProjectFlowActions;
  states: ProjectFlowStates;
}
