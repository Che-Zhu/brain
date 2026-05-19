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
  CanvasLayoutResourceKind,
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

function resourceRefFromRecord(
  kind: CanvasLayoutResourceKind,
  source: Record<string, unknown> | undefined
): CanvasLayoutResourceRef | undefined {
  const name = nonEmptyString(source?.name);
  const namespace = nonEmptyString(source?.namespace);

  if (name === undefined || namespace === undefined) {
    return undefined;
  }

  return { kind, name, namespace };
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

  switch (node.type) {
    case CANVAS_CONTAINER_NODE_TYPE:
      return resourceRefFromRecord("AP", asRecord(data?.states));
    case CANVAS_DATABASE_NODE_TYPE:
      return resourceRefFromRecord("DB", asRecord(data?.workload));
    case CANVAS_ENTRY_NODE_TYPE:
      return resourceRefFromRecord("EntryPoint", asRecord(data?.resource));
    default:
      return undefined;
  }
}

function lastSeenUidFromNode(node: Node): string | undefined {
  const data = asRecord(node.data);

  switch (node.type) {
    case CANVAS_CONTAINER_NODE_TYPE:
      return nonEmptyString(asRecord(data?.states)?.uid);
    case CANVAS_DATABASE_NODE_TYPE:
      return nonEmptyString(data?.uid);
    case CANVAS_ENTRY_NODE_TYPE:
      return nonEmptyString(asRecord(data?.resource)?.uid);
    default:
      return undefined;
  }
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
): Node[] {
  if (layout === undefined) {
    return nodes.map((node) => ({ ...node }));
  }

  const positionByRef = new Map<string, CanvasLayoutPosition>();
  for (const item of layout.nodes) {
    const position = finitePosition(item.position);
    if (position !== undefined) {
      positionByRef.set(canvasLayoutResourceKey(item.ref), position);
    }
  }

  return nodes.map((node) => {
    const ref = canvasLayoutResourceRefFromNode(node);
    if (ref === undefined) {
      return { ...node };
    }
    const savedPosition = positionByRef.get(canvasLayoutResourceKey(ref));
    return savedPosition === undefined
      ? { ...node }
      : { ...node, position: savedPosition };
  });
}
