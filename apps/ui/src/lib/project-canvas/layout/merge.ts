import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutPosition,
  CanvasLayoutResourceRef,
} from "./types";

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

export function canvasLayoutResourceKey(ref: CanvasLayoutResourceRef): string {
  return `${ref.kind}:${ref.namespace}:${ref.name}`;
}

function finitePosition(
  position: CanvasLayoutPosition | undefined
): CanvasLayoutPosition | undefined {
  if (
    position == null ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y)
  ) {
    return undefined;
  }
  return { x: position.x, y: position.y };
}

export function canvasLayoutResourceRefFromNode(
  node: Node
): CanvasLayoutResourceRef | undefined {
  const data = asRecord(node.data);

  if (node.type === CANVAS_CONTAINER_NODE_TYPE) {
    const states = asRecord(data?.states);
    const name = nonEmptyString(states?.name);
    const namespace = nonEmptyString(states?.namespace);
    return name === undefined || namespace === undefined
      ? undefined
      : { kind: "AP", name, namespace };
  }

  if (node.type === CANVAS_DATABASE_NODE_TYPE) {
    const workload = asRecord(data?.workload);
    const name = nonEmptyString(workload?.name);
    const namespace = nonEmptyString(workload?.namespace);
    return name === undefined || namespace === undefined
      ? undefined
      : { kind: "DB", name, namespace };
  }

  if (node.type === CANVAS_ENTRY_NODE_TYPE) {
    const resource = asRecord(data?.resource);
    const name = nonEmptyString(resource?.name);
    const namespace = nonEmptyString(resource?.namespace);
    return name === undefined || namespace === undefined
      ? undefined
      : { kind: "EntryPoint", name, namespace };
  }

  return undefined;
}

function lastSeenUidFromNode(node: Node): string | undefined {
  const data = asRecord(node.data);
  if (node.type === CANVAS_CONTAINER_NODE_TYPE) {
    const states = asRecord(data?.states);
    return nonEmptyString(states?.uid);
  }
  if (node.type === CANVAS_DATABASE_NODE_TYPE) {
    return nonEmptyString(data?.uid);
  }
  if (node.type === CANVAS_ENTRY_NODE_TYPE) {
    const resource = asRecord(data?.resource);
    return nonEmptyString(resource?.uid);
  }
  return undefined;
}

export function canvasLayoutNodeFromNode(
  node: Node
): CanvasLayoutNode | undefined {
  const ref = canvasLayoutResourceRefFromNode(node);
  const position = finitePosition(node.position);
  if (ref === undefined || position === undefined) {
    return undefined;
  }
  const lastSeenUid = lastSeenUidFromNode(node);
  return {
    ...(lastSeenUid === undefined ? {} : { lastSeenUid }),
    position,
    ref,
  };
}

export function applyCanvasLayoutToNodes(
  nodes: Node[],
  layout: CanvasLayoutDocument | undefined
): { nodes: Node[] } {
  if (layout === undefined) {
    return { nodes: nodes.map((node) => ({ ...node })) };
  }

  const positionByRef = new Map<string, CanvasLayoutPosition>();
  for (const item of layout.nodes) {
    const position = finitePosition(item.position);
    if (position !== undefined) {
      positionByRef.set(canvasLayoutResourceKey(item.ref), position);
    }
  }

  return {
    nodes: nodes.map((node) => {
      const ref = canvasLayoutResourceRefFromNode(node);
      if (ref === undefined) {
        return { ...node };
      }
      const savedPosition = positionByRef.get(canvasLayoutResourceKey(ref));
      return savedPosition === undefined
        ? { ...node }
        : { ...node, position: savedPosition };
    }),
  };
}
