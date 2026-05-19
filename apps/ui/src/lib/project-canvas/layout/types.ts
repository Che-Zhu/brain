export type CanvasLayoutResourceKind = "AP" | "DB" | "EntryPoint";

export interface CanvasLayoutResourceRef {
  kind: CanvasLayoutResourceKind;
  name: string;
  namespace: string;
}

export interface CanvasLayoutPosition {
  x: number;
  y: number;
}

export interface CanvasLayoutNode {
  lastSeenUid?: string;
  orphanedAt?: string;
  position: CanvasLayoutPosition;
  ref: CanvasLayoutResourceRef;
}

export interface CanvasLayoutDocument {
  namespace: string;
  nodes: CanvasLayoutNode[];
  projectNameSnapshot?: string;
  projectUid: string;
  version: number;
}

export interface CanvasLayoutPatch {
  nodes: CanvasLayoutNode[];
  projectNameSnapshot?: string;
}
