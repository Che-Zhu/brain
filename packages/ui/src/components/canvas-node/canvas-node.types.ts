import type { PointerEvent, ReactNode } from "react";

export type CanvasNodeVisualStatusTone =
  | "negative"
  | "neutral"
  | "positive"
  | "progress"
  | "warning";

export interface CanvasNodeStatus {
  label: string;
  visualTone?: CanvasNodeVisualStatusTone;
}

export interface CanvasNodeInteractionState {
  dragging?: boolean;
  selected?: boolean;
}

export type CanvasNodeConnectionSide = "bottom" | "left" | "right" | "top";

export type CanvasNodeConnectionEvent = PointerEvent<HTMLButtonElement>;

export interface CanvasNodeState {
  interaction?: CanvasNodeInteractionState;
}

export interface CanvasNodeActions {
  collapse?: () => void;
  expand?: () => void;
  startConnection?: (
    side: CanvasNodeConnectionSide,
    event: CanvasNodeConnectionEvent
  ) => void;
}

export interface CanvasNodeMeta {
  expanded: boolean;
}

export interface CanvasNodeContextValue {
  actions: Required<Pick<CanvasNodeActions, "collapse" | "expand">> &
    Omit<CanvasNodeActions, "collapse" | "expand">;
  meta: CanvasNodeMeta;
  state: CanvasNodeState;
}

export interface CanvasNodeProviderProps {
  children?: ReactNode;
  value: CanvasNodeContextValue;
}

export interface CanvasNodeRootProps {
  children?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  interaction?: CanvasNodeInteractionState;
  onExpandedChange?: (expanded: boolean) => void;
  onStartConnection?: CanvasNodeActions["startConnection"];
}
