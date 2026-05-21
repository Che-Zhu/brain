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
} from "./cleanup";
import {
  canvasLayoutResourceKey as layoutResourceKey,
  canvasLayoutResourceRefFromNode as layoutResourceRefFromNode,
  placeCanvasNodes,
} from "./placement";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutPosition,
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

function canvasLayoutExpandedFromNode(node: Node): boolean | undefined {
  const data = asRecord(node.data);
  const layout = asRecord(data?.layout);
  return typeof layout?.expanded === "boolean" ? layout.expanded : undefined;
}

function withCanvasLayoutExpansion(
  node: Node,
  expanded: boolean | undefined
): Node {
  if (expanded === undefined) {
    return node;
  }

  const data = asRecord(node.data) ?? {};
  const layout = asRecord(data.layout) ?? {};
  return {
    ...node,
    data: {
      ...data,
      layout: {
        ...layout,
        expanded,
      },
    },
  };
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
  const ref = layoutResourceRefFromNode(node);
  const position = finitePosition(node.position);
  if (ref === undefined || position === undefined) {
    return undefined;
  }
  const expanded = canvasLayoutExpandedFromNode(node) ?? false;
  const lastSeenUid = lastSeenUidFromNode(node);
  return {
    expanded,
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
      return other !== undefined && layoutNodesEqual(node, other);
    })
  );
}

function layoutNodesEqual(a: CanvasLayoutNode, b: CanvasLayoutNode): boolean {
  return (
    a.expanded === b.expanded &&
    a.lastSeenUid === b.lastSeenUid &&
    a.orphanedAt === b.orphanedAt &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.ref.kind === b.ref.kind &&
    a.ref.name === b.ref.name &&
    a.ref.namespace === b.ref.namespace
  );
}

function restoredLayoutNodeFromDetectedNode(
  saved: CanvasLayoutNode,
  detected: Node
): CanvasLayoutNode {
  const lastSeenUid = lastSeenUidFromNode(detected) ?? saved.lastSeenUid;
  const restored: CanvasLayoutNode = {
    position: { x: saved.position.x, y: saved.position.y },
    ref: { ...saved.ref },
  };
  if (saved.expanded !== undefined) {
    restored.expanded = saved.expanded;
  }
  if (lastSeenUid !== undefined) {
    restored.lastSeenUid = lastSeenUid;
  }
  return restored;
}

function orphanedLayoutNode(
  node: CanvasLayoutNode,
  orphanedAt: string
): CanvasLayoutNode {
  const orphan = cloneCanvasLayoutNode(node);
  if (orphan.orphanedAt === undefined) {
    orphan.orphanedAt = orphanedAt;
  }
  return orphan;
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
      nodes: placeCanvasNodes({ layout, nodes }),
    };
  }

  const nowIso = now.toISOString();
  const cleanedLayout = cleanupCanvasLayoutDocument(layout, { now });
  const layoutByRef = new Map<string, CanvasLayoutNode>();
  for (const item of cleanedLayout.nodes) {
    layoutByRef.set(layoutResourceKey(item.ref), item);
  }

  const nextLayoutByRef = new Map<string, CanvasLayoutNode>();
  const renderedNodes = nodes.map((node) => {
    const ref = layoutResourceRefFromNode(node);
    if (ref === undefined) {
      return { ...node };
    }

    const key = layoutResourceKey(ref);
    const saved = layoutByRef.get(key);
    if (saved === undefined) {
      return { ...node };
    }

    nextLayoutByRef.set(key, restoredLayoutNodeFromDetectedNode(saved, node));

    const savedPosition = finitePosition(saved.position);
    const positioned =
      savedPosition === undefined
        ? { ...node }
        : { ...node, position: savedPosition };
    return withCanvasLayoutExpansion(positioned, saved.expanded);
  });

  const nextLayout = cloneCanvasLayoutDocument(cleanedLayout);
  nextLayout.nodes = cleanedLayout.nodes.map((item) => {
    const key = layoutResourceKey(item.ref);
    const live = nextLayoutByRef.get(key);
    if (live !== undefined) {
      return live;
    }
    return orphanedLayoutNode(item, nowIso);
  });

  return {
    changed: !layoutDocumentsEqual(layout, nextLayout),
    layout: nextLayout,
    nodes: placeCanvasNodes({ layout: cleanedLayout, nodes: renderedNodes }),
  };
}

export function applyCanvasLayoutToNodes(
  nodes: Node[],
  layout: CanvasLayoutDocument | undefined
): Node[] {
  return mergeCanvasLayoutWithDetectedNodes({ layout, nodes }).nodes;
}
