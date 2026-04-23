import type { EdgeRef, JobId, NodeRef } from "@/shared/types/resource";

export interface CanvasNode extends NodeRef {
  ghostJobId?: JobId;
  isGhost?: boolean;
}

export type CanvasEdge = EdgeRef;

// §4.2 compound interface: { state, actions, meta } — narrow, not impl types.
// Keep minimal for foundation; grows as nodes / selection / drag land.
export interface CanvasState {
  projectId: string;
}

export interface CanvasActions {
  fitView: () => void;
}

// Empty for now; retained per §4.2 rule ("stick to the triple even when meta is empty").
export type CanvasMeta = Record<string, never>;

export interface CanvasContextValue {
  actions: CanvasActions;
  meta: CanvasMeta;
  state: CanvasState;
}
