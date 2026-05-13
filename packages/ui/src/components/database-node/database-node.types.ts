import type {
  CanvasNodeConnectionEvent,
  CanvasNodeConnectionSide,
  CanvasNodeInteractionState,
  CanvasNodeStatus,
} from "@workspace/ui/components/canvas-node/canvas-node";
import type { ReactNode } from "react";

export type DatabaseEngineKey =
  | "mongodb"
  | "mysql"
  | "postgresql"
  | "redis"
  | (string & {});

export type DatabaseNodeMetricKey = "cpu" | "memory" | "storage";

export type DatabaseNodeMetricValue = number | string;

export interface DatabaseNodeStates {
  displayEngine: string;
  engineKey?: DatabaseEngineKey;
  formattedVersion?: string;
  metrics?: Partial<Record<DatabaseNodeMetricKey, DatabaseNodeMetricValue>>;
  name: string;
  status?: CanvasNodeStatus;
}

interface DatabaseNodeConnectionBase {
  displayValue?: string;
  id?: string;
  label: string;
  value?: string;
}

export interface DatabaseNodePrivateConnection
  extends DatabaseNodeConnectionBase {
  kind: "private";
  unavailableMessage?: string;
}

export interface DatabaseNodePublicConnection
  extends DatabaseNodeConnectionBase {
  kind: "public";
  provisioningMessage?: string;
  publicAccess: {
    enabled: boolean;
    loading?: boolean;
  };
}

export type DatabaseNodeConnection =
  | DatabaseNodePrivateConnection
  | DatabaseNodePublicConnection;

export type DatabaseNodeConnectionKey = string;

export type DatabaseNodeCopyConnectionHandler = (
  connection: DatabaseNodeConnection,
  index: number
) => Promise<void> | void;

export type DatabaseNodeTogglePublicConnectionHandler = (
  connection: DatabaseNodePublicConnection,
  index: number,
  nextEnabled: boolean
) => Promise<void> | void;

export type DatabaseNodeStartConnectionHandler = (
  side: CanvasNodeConnectionSide,
  event: CanvasNodeConnectionEvent
) => void;

export type DatabaseNodeQuickActionKey = "console" | "logs" | "metrics";

export type DatabaseNodeLifecycleActionKey =
  | "delete"
  | "restart"
  | "start"
  | "stop";

export interface DatabaseNodeAction {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => Promise<void> | void;
}

export type DatabaseNodeQuickActions = Partial<
  Record<DatabaseNodeQuickActionKey, DatabaseNodeAction>
>;

export type DatabaseNodeLifecycleActions = Partial<
  Record<DatabaseNodeLifecycleActionKey, DatabaseNodeAction>
>;

export interface DatabaseNodeActions {
  copyConnection?: DatabaseNodeCopyConnectionHandler;
  lifecycleActions?: DatabaseNodeLifecycleActions;
  quickActions?: DatabaseNodeQuickActions;
  togglePublicConnection?: DatabaseNodeTogglePublicConnectionHandler;
}

export interface DatabaseNodeMeta {
  copiedFeedbackMs?: number;
}

export interface DatabaseNodeState {
  connections?: DatabaseNodeConnection[];
  copiedConnectionKey?: DatabaseNodeConnectionKey | null;
  states: DatabaseNodeStates;
}

export interface DatabaseNodeContextValue {
  actions: DatabaseNodeActions;
  meta: DatabaseNodeMeta;
  state: DatabaseNodeState;
}

export interface DatabaseNodeProviderProps {
  children?: ReactNode;
  value: DatabaseNodeContextValue;
}

export interface DatabaseNodeRootProps {
  children?: ReactNode;
  connections?: DatabaseNodeConnection[];
  copiedConnectionKey?: DatabaseNodeConnectionKey | null;
  copiedFeedbackMs?: number;
  defaultExpanded?: boolean;
  expanded?: boolean;
  interaction?: CanvasNodeInteractionState;
  lifecycleActions?: DatabaseNodeLifecycleActions;
  onCopyConnection?: DatabaseNodeCopyConnectionHandler;
  onExpandedChange?: (expanded: boolean) => void;
  onStartConnection?: DatabaseNodeStartConnectionHandler;
  onTogglePublicConnection?: DatabaseNodeTogglePublicConnectionHandler;
  quickActions?: DatabaseNodeQuickActions;
  states: DatabaseNodeStates;
}
