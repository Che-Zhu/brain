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
