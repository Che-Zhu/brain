import type {
  CanvasNodeConnectionEvent,
  CanvasNodeConnectionSide,
  CanvasNodeInteractionState,
  CanvasNodeStatus,
} from "@workspace/ui/components/canvas-node/canvas-node";
import type { ReactNode } from "react";

export interface EntryNodeStates {
  name: string;
}

export interface EntryNodeAccessDomain {
  label?: string;
  value: string;
}

export interface EntryNodeTarget {
  id?: string;
  label: string;
  status?: CanvasNodeStatus;
  value: string;
}

export type EntryNodeTargetKey = string;

export type EntryNodeCopyTargetHandler = (
  target: EntryNodeTarget,
  index: number
) => Promise<void> | void;

export type EntryNodeOpenTargetSettingsHandler = (
  target: EntryNodeTarget,
  index: number
) => void;

export type EntryNodeStartConnectionHandler = (
  side: CanvasNodeConnectionSide,
  event: CanvasNodeConnectionEvent
) => void;

export interface EntryNodeState {
  accessDomain?: EntryNodeAccessDomain;
  copiedTargetKey?: EntryNodeTargetKey | null;
  states: EntryNodeStates;
  targets?: EntryNodeTarget[];
}

export interface EntryNodeActions {
  copyTarget?: EntryNodeCopyTargetHandler;
  openTargetSettings?: EntryNodeOpenTargetSettingsHandler;
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
  accessDomain?: EntryNodeAccessDomain;
  children?: ReactNode;
  copiedFeedbackMs?: number;
  copiedTargetKey?: EntryNodeTargetKey | null;
  defaultExpanded?: boolean;
  expanded?: boolean;
  interaction?: CanvasNodeInteractionState;
  onCopyTarget?: EntryNodeCopyTargetHandler;
  onExpandedChange?: (expanded: boolean) => void;
  onOpenTargetSettings?: EntryNodeOpenTargetSettingsHandler;
  onStartConnection?: EntryNodeStartConnectionHandler;
  states: EntryNodeStates;
  targets?: EntryNodeTarget[];
}
