import type {
  CanvasNodeConnectionEvent,
  CanvasNodeConnectionSide,
  CanvasNodeInteractionState,
  CanvasNodeStatus,
} from "@workspace/ui/components/canvas-node/canvas-node";
import type { ReactNode } from "react";

export type EnvironmentRuntimeKey =
  | "cpp"
  | "dotnet"
  | "go"
  | "java"
  | "nodejs"
  | "php"
  | "python"
  | "ruby"
  | "rust"
  | (string & {});

export type EnvironmentNodeMetricKey = "cpu" | "memory" | "storage";

export type EnvironmentNodeMetricValue = number | string;

export interface EnvironmentNodeStates {
  displayRuntime: string;
  formattedVersion?: string;
  metrics?: Partial<
    Record<EnvironmentNodeMetricKey, EnvironmentNodeMetricValue>
  >;
  name: string;
  runtimeKey?: EnvironmentRuntimeKey;
  status?: CanvasNodeStatus;
}

export type EnvironmentNodeQuickActionKey =
  | "ide"
  | "logs"
  | "metrics"
  | "terminal";

export type EnvironmentNodeLifecycleActionKey =
  | "delete"
  | "restart"
  | "start"
  | "stop";

export interface EnvironmentNodeAction {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => Promise<void> | void;
}

export type EnvironmentNodeQuickActions = Partial<
  Record<EnvironmentNodeQuickActionKey, EnvironmentNodeAction>
>;

export type EnvironmentNodeLifecycleActions = Partial<
  Record<EnvironmentNodeLifecycleActionKey, EnvironmentNodeAction>
>;

export type EnvironmentNodeCopyLaunchCommandHandler = (
  launchCommand: string
) => Promise<void> | void;

export type EnvironmentNodeStartConnectionHandler = (
  side: CanvasNodeConnectionSide,
  event: CanvasNodeConnectionEvent
) => void;

export interface EnvironmentNodeActions {
  copyLaunchCommand: EnvironmentNodeCopyLaunchCommandHandler;
  lifecycleActions?: EnvironmentNodeLifecycleActions;
  quickActions?: EnvironmentNodeQuickActions;
}

export interface EnvironmentNodeMeta {
  copiedFeedbackMs?: number;
}

export interface EnvironmentNodeState {
  copiedLaunchCommand?: boolean;
  launchCommand?: string;
  states: EnvironmentNodeStates;
}

export interface EnvironmentNodeContextValue {
  actions: EnvironmentNodeActions;
  meta: EnvironmentNodeMeta;
  state: EnvironmentNodeState;
}

export interface EnvironmentNodeProviderProps {
  children?: ReactNode;
  value: EnvironmentNodeContextValue;
}

export interface EnvironmentNodeRootProps {
  children?: ReactNode;
  copiedFeedbackMs?: number;
  copiedLaunchCommand?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  interaction?: CanvasNodeInteractionState;
  launchCommand?: string;
  lifecycleActions?: EnvironmentNodeLifecycleActions;
  onCopyLaunchCommand?: EnvironmentNodeCopyLaunchCommandHandler;
  onExpandedChange?: (expanded: boolean) => void;
  onStartConnection?: EnvironmentNodeStartConnectionHandler;
  quickActions?: EnvironmentNodeQuickActions;
  states: EnvironmentNodeStates;
}
