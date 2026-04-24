import type { EdgeRef, JobId, NodeRef } from "./resource-types";

export interface CanvasNode extends NodeRef {
  ghostJobId?: JobId;
  isGhost?: boolean;
}

export type CanvasEdge = EdgeRef;

export interface CanvasState {
  projectId: string;
}

export interface CanvasActions {
  fitView: () => void;
}

export type CanvasMeta = Record<string, never>;

export interface CanvasContextValue {
  actions: CanvasActions;
  meta: CanvasMeta;
  state: CanvasState;
}
