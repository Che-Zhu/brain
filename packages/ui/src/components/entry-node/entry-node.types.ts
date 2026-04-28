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

export interface EntryNodeValue {
  states: EntryNodeStates;
}
