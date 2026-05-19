import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import {
  cleanupCanvasLayoutDocument,
  cloneCanvasLayoutDocument,
  cloneCanvasLayoutNode,
  isCanvasLayoutOrphanExpired,
} from "./cleanup";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutPosition,
  CanvasLayoutResourceKind,
  CanvasLayoutResourceRef,
} from "./types";

export interface CanvasLayoutMergeResult {
  changed: boolean;
  layout: CanvasLayoutDocument | undefined;
  nodes: Node[];
}

export interface CanvasLayoutMergeOptions {
  layout: CanvasLayoutDocument | undefined;
  nodes: Node[];
  now?: Date;
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

function layoutDocumentsEqual(
  a: CanvasLayoutDocument | undefined,
  b: CanvasLayoutDocument | undefined
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return (
    a.namespace === b.namespace &&
    a.projectNameSnapshot === b.projectNameSnapshot &&
    a.projectUid === b.projectUid &&
    a.version === b.version &&
    a.nodes.length === b.nodes.length &&
    a.nodes.every((node, index) => {
      const other = b.nodes[index];
      return (
        other !== undefined &&
        node.label === other.label &&
        node.lastSeenUid === other.lastSeenUid &&
        node.orphanedAt === other.orphanedAt &&
        node.position.x === other.position.x &&
        node.position.y === other.position.y &&
        node.ref.kind === other.ref.kind &&
        node.ref.name === other.ref.name &&
        node.ref.namespace === other.ref.namespace
      );
    })
  );
}

export function mergeCanvasLayoutWithDetectedNodes({
  layout,
  nodes,
  now = new Date(),
}: CanvasLayoutMergeOptions): CanvasLayoutMergeResult {
  if (layout === undefined) {
    return {
      changed: false,
      layout: undefined,
      nodes: nodes.map((node) => ({ ...node })),
    };
  }

  const nowIso = now.toISOString();
  const cleanedLayout = cleanupCanvasLayoutDocument(layout, { now });
  const layoutByRef = new Map<string, CanvasLayoutNode>();
  for (const item of cleanedLayout.nodes) {
    layoutByRef.set(canvasLayoutResourceKey(item.ref), item);
  }

  const detectedRefKeys = new Set<string>();
  const nextLayoutByRef = new Map<string, CanvasLayoutNode>();
  const renderedNodes = nodes.map((node) => {
    const ref = canvasLayoutResourceRefFromNode(node);
    if (ref === undefined) {
      return { ...node };
    }

    const key = canvasLayoutResourceKey(ref);
    detectedRefKeys.add(key);
    const saved = layoutByRef.get(key);
    if (saved === undefined) {
      return { ...node };
    }

    const lastSeenUid = lastSeenUidFromNode(node) ?? saved.lastSeenUid;
    const nextLayoutNode: CanvasLayoutNode = {
      ...(saved.label === undefined ? {} : { label: saved.label }),
      ...(lastSeenUid === undefined ? {} : { lastSeenUid }),
      position: { x: saved.position.x, y: saved.position.y },
      ref: { ...saved.ref },
    };
    nextLayoutByRef.set(key, nextLayoutNode);

    const savedPosition = finitePosition(saved.position);
    return savedPosition === undefined
      ? { ...node }
      : { ...node, position: savedPosition };
  });

  const nextLayout = cloneCanvasLayoutDocument(cleanedLayout);
  nextLayout.nodes = cleanedLayout.nodes.flatMap((item) => {
    const key = canvasLayoutResourceKey(item.ref);
    const live = nextLayoutByRef.get(key);
    if (live !== undefined) {
      return [live];
    }
    if (detectedRefKeys.has(key)) {
      return [];
    }
    if (isCanvasLayoutOrphanExpired(item, now)) {
      return [];
    }
    return [
      item.orphanedAt === undefined
        ? { ...cloneCanvasLayoutNode(item), orphanedAt: nowIso }
        : cloneCanvasLayoutNode(item),
    ];
  });

  return {
    changed: !layoutDocumentsEqual(layout, nextLayout),
    layout: nextLayout,
    nodes: renderedNodes,
  };
}

export function applyCanvasLayoutToNodes(
  nodes: Node[],
  layout: CanvasLayoutDocument | undefined
): Node[] {
  return mergeCanvasLayoutWithDetectedNodes({ layout, nodes }).nodes;
}
