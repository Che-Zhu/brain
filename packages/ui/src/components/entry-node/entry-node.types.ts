import type {
  CanvasNodeInteractionState,
  CanvasNodeVisualStatusTone,
} from "@workspace/ui/components/canvas-node/canvas-node";
import type { ReactNode } from "react";

export interface EntryNodeStates {
  name: string;
}

export interface EntryNodeAccessDomain {
  label?: string;
  value: string;
}

export type EntryNodeTargetStatusTone =
  | "accessible"
  | "degraded"
  | "inaccessible"
  | "not-configured"
  | "progressing"
  | "unknown"
  | (string & {});

export interface EntryNodeTargetStatus {
  label: string;
  tone?: EntryNodeTargetStatusTone;
  visualTone?: CanvasNodeVisualStatusTone;
}

export interface EntryNodeTarget {
  id?: string;
  label: string;
  status?: EntryNodeTargetStatus;
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
  states: EntryNodeStates;
  targets?: EntryNodeTarget[];
}
