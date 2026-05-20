import type { Connection, Edge, Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "../nodes/constants";

export interface ProjectCanvasConnectionCommandAp {
  name: string;
  namespace: string;
  nodeId: string;
  uid?: string;
}

export interface ProjectCanvasConnectionCommandDb {
  name: string;
  namespace: string;
  nodeId: string;
}

export type ProjectCanvasConnectionCommand =
  | {
      ap: ProjectCanvasConnectionCommandAp;
      db: ProjectCanvasConnectionCommandDb;
      kind: "openApDbAddReference";
    }
  | {
      kind: "discard";
      reason: "readOnly" | "unsupported";
    };

export interface ClassifyProjectCanvasConnectionCommandOptions {
  connection: Connection;
  /**
   * Present for command-routing callers that hold current Canvas Connections.
   * AP-DB Connecting Edge commands intentionally ignore existing derived edges.
   */
  existingEdges?: readonly Edge[];
  nodes: readonly Node[];
  readOnly: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function apFromNode(
  node: Node | undefined
): ProjectCanvasConnectionCommandAp | undefined {
  if (node?.type !== CANVAS_CONTAINER_NODE_TYPE) {
    return undefined;
  }
  const states = asRecord(asRecord(node.data)?.states);
  const kind = nonEmptyString(states?.kind);
  if (kind !== undefined && kind.toUpperCase() !== "AP") {
    return undefined;
  }
  const name = nonEmptyString(states?.name);
  const namespace = nonEmptyString(states?.namespace);
  if (name === undefined || namespace === undefined) {
    return undefined;
  }
  return {
    name,
    namespace,
    nodeId: node.id,
    ...(nonEmptyString(states?.uid) === undefined
      ? {}
      : { uid: nonEmptyString(states?.uid) }),
  };
}

function dbFromNode(
  node: Node | undefined
): ProjectCanvasConnectionCommandDb | undefined {
  if (node?.type !== CANVAS_DATABASE_NODE_TYPE) {
    return undefined;
  }
  const workload = asRecord(asRecord(node.data)?.workload);
  const name = nonEmptyString(workload?.name);
  const namespace = nonEmptyString(workload?.namespace);
  if (name === undefined || namespace === undefined) {
    return undefined;
  }
  return { name, namespace, nodeId: node.id };
}

export function classifyProjectCanvasConnectionCommand({
  connection,
  nodes,
  readOnly,
}: ClassifyProjectCanvasConnectionCommandOptions): ProjectCanvasConnectionCommand {
  if (readOnly) {
    return { kind: "discard", reason: "readOnly" };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sourceNode =
    connection.source == null ? undefined : nodeById.get(connection.source);
  const targetNode =
    connection.target == null ? undefined : nodeById.get(connection.target);
  const sourceAp = apFromNode(sourceNode);
  const targetDb = dbFromNode(targetNode);
  if (sourceAp !== undefined && targetDb !== undefined) {
    return {
      ap: sourceAp,
      db: targetDb,
      kind: "openApDbAddReference",
    };
  }
  const sourceDb = dbFromNode(sourceNode);
  const targetAp = apFromNode(targetNode);
  if (sourceDb !== undefined && targetAp !== undefined) {
    return {
      ap: targetAp,
      db: sourceDb,
      kind: "openApDbAddReference",
    };
  }

  return { kind: "discard", reason: "unsupported" };
}
