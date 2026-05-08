import type {
  CanvasNodeConnectionEvent,
  CanvasNodeConnectionSide,
  CanvasNodeInteractionState,
  CanvasNodeStatus,
} from "@workspace/ui/components/canvas-node/canvas-node";
import type { ReactNode } from "react";

export interface EntryNodeStates {
  name: string;
  status?: CanvasNodeStatus;
}

export type EntryNodeDomainKey = "access" | "private" | "public";

export interface EntryNodeDomain {
  label: string;
  status?: CanvasNodeStatus;
  value: string;
}

export type EntryNodeDomains = Partial<
  Record<EntryNodeDomainKey, EntryNodeDomain>
>;

export type EntryNodeCopyDomainHandler = (
  key: EntryNodeDomainKey,
  value: string
) => Promise<void> | void;

export type EntryNodeStartConnectionHandler = (
  side: CanvasNodeConnectionSide,
  event: CanvasNodeConnectionEvent
) => void;

export interface EntryNodeState {
  copiedDomainKey?: EntryNodeDomainKey | null;
  domains?: EntryNodeDomains;
  states: EntryNodeStates;
}

export interface EntryNodeActions {
  copyDomain: EntryNodeCopyDomainHandler;
}

export interface EntryNodeMeta {
  copiedFeedbackMs?: number;
}

export interface EntryNodeContextValue {
  actions: EntryNodeActions;
  meta: EntryNodeMeta;
  state: EntryNodeState;
}

export interface EntryNodeProviderProps {
  children?: ReactNode;
  value: EntryNodeContextValue;
}

export interface EntryNodeRootProps {
  children?: ReactNode;
  copiedDomainKey?: EntryNodeDomainKey | null;
  copiedFeedbackMs?: number;
  defaultExpanded?: boolean;
  domains?: EntryNodeDomains;
  expanded?: boolean;
  interaction?: CanvasNodeInteractionState;
  onCopyDomain?: EntryNodeCopyDomainHandler;
  onExpandedChange?: (expanded: boolean) => void;
  onStartConnection?: EntryNodeStartConnectionHandler;
  states: EntryNodeStates;
}
