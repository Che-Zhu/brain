import type { Edge, Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "../nodes/constants";
import type { CanvasConnectionResourceRef } from "./detected-connections";

export interface PendingApDbCanvasReference {
  id: string;
  source: CanvasConnectionResourceRef & { kind: "AP" };
  target: CanvasConnectionResourceRef & { kind: "DB" };
}

export interface PendingApDbCanvasConnectionEdgesOptions {
  existingEdges?: readonly Edge[];
  nodes: readonly Node[];
  pendingReferences: readonly PendingApDbCanvasReference[];
}

export function addPendingApDbCanvasReferences(
  current: readonly PendingApDbCanvasReference[],
  next: readonly PendingApDbCanvasReference[]
): PendingApDbCanvasReference[] {
  const byId = new Map(current.map((reference) => [reference.id, reference]));
  for (const reference of next) {
    byId.set(reference.id, reference);
  }
  return Array.from(byId.values());
}

export function removePendingApDbCanvasReferences(
  current: readonly PendingApDbCanvasReference[],
  ids: readonly string[]
): PendingApDbCanvasReference[] {
  const idsToRemove = new Set(ids);
  return current.filter((reference) => !idsToRemove.has(reference.id));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function resourceKey(ref: CanvasConnectionResourceRef): string {
  return `${ref.kind}:${ref.namespace}:${ref.name}`;
}

function resourceRefFromRecord(
  kind: "AP" | "DB",
  source: Record<string, unknown> | undefined
): CanvasConnectionResourceRef | undefined {
  const name = nonEmptyString(source?.name);
  const namespace = nonEmptyString(source?.namespace);
  if (name === undefined || namespace === undefined) {
    return undefined;
  }
  return { kind, name, namespace };
}

function nodeResourceRef(node: Node): CanvasConnectionResourceRef | undefined {
  const data = asRecord(node.data);

  switch (node.type) {
    case CANVAS_CONTAINER_NODE_TYPE:
      return resourceRefFromRecord("AP", asRecord(data?.states));
    case CANVAS_DATABASE_NODE_TYPE:
      return resourceRefFromRecord("DB", asRecord(data?.workload));
    default:
      return undefined;
  }
}

export function pendingApDbCanvasConnectionEdges({
  existingEdges = [],
  nodes,
  pendingReferences,
}: PendingApDbCanvasConnectionEdgesOptions): Edge[] {
  const nodeIdByResourceKey = new Map<string, string>();
  for (const node of nodes) {
    const ref = nodeResourceRef(node);
    if (ref !== undefined) {
      nodeIdByResourceKey.set(resourceKey(ref), node.id);
    }
  }

  const existingNodePairs = new Set(
    existingEdges.map((edge) => `${edge.source}->${edge.target}`)
  );
  const seenEdgeIds = new Set<string>();
  const edges: Edge[] = [];

  for (const reference of pendingReferences) {
    const sourceKey = resourceKey(reference.source);
    const targetKey = resourceKey(reference.target);
    const source = nodeIdByResourceKey.get(sourceKey);
    const target = nodeIdByResourceKey.get(targetKey);
    if (source === undefined || target === undefined) {
      continue;
    }
    if (existingNodePairs.has(`${source}->${target}`)) {
      continue;
    }

    const id = `pending:${sourceKey}->${targetKey}`;
    if (seenEdgeIds.has(id)) {
      continue;
    }
    seenEdgeIds.add(id);
    edges.push({
      data: { pending: true },
      id,
      source,
      target,
    });
  }

  return edges;
}
