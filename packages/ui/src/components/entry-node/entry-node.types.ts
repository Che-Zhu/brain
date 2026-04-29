import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

export type EntryNodeStatusTone =
  | "accessible"
  | "available"
  | "binding"
  | "bound"
  | "complete"
  | "creating"
  | "degraded"
  | "deleting"
  | "error"
  | "failed"
  | "inaccessible"
  | "pending"
  | "progressing"
  | "ready"
  | "running"
  | "shutdown"
  | "stopped"
  | "stopping"
  | "succeeded"
  | "unhealthy"
  | "unknown";

export interface EntryNodeStatus {
  label: string;
  tone?: EntryNodeStatusTone;
}

export interface EntryNodeStates {
  name: string;
  status?: EntryNodeStatus;
}

export type EntryNodeDomainKey = "access" | "private" | "public";

export interface EntryNodeDomain {
  label: string;
  status?: EntryNodeStatus;
  value: string;
}

export type EntryNodeDomains = Partial<
  Record<EntryNodeDomainKey, EntryNodeDomain>
>;

/** Screen-space drag angle in degrees: 0 = right, 90 = down. */
export type EntryNodeDragAngle = number;

export type EntryNodeConnectionSide = "bottom" | "left" | "right" | "top";

export type EntryNodeConnectionEvent =
  | KeyboardEvent<HTMLButtonElement>
  | PointerEvent<HTMLButtonElement>;

export interface EntryNodeInteractionState {
  dragAngle?: EntryNodeDragAngle;
  dragging?: boolean;
  selected?: boolean;
}

export interface EntryNodeState {
  copiedDomainKey?: EntryNodeDomainKey | null;
  domains?: EntryNodeDomains;
  interaction?: EntryNodeInteractionState;
  states: EntryNodeStates;
}

export interface EntryNodeActions {
  collapse?: () => void;
  copyDomain?: (key: EntryNodeDomainKey, value: string) => Promise<void> | void;
  expand?: () => void;
  startConnection?: (
    side: EntryNodeConnectionSide,
    event: EntryNodeConnectionEvent
  ) => void;
}

export interface EntryNodeMeta {
  copiedFeedbackMs?: number;
  expanded?: boolean;
}

export interface EntryNodeContextValue {
  actions: Required<Pick<EntryNodeActions, "copyDomain">> &
    Omit<EntryNodeActions, "copyDomain">;
  meta: EntryNodeMeta;
  state: EntryNodeState;
}

export interface EntryNodeProviderProps {
  children?: ReactNode;
  value: EntryNodeContextValue;
}

export interface EntryNodeRootProps {
  actions?: EntryNodeActions;
  children?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  meta?: Omit<EntryNodeMeta, "expanded">;
  onExpandedChange?: (expanded: boolean) => void;
  state: EntryNodeState;
}
