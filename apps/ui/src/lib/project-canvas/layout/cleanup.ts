import type { CanvasLayoutDocument, CanvasLayoutNode } from "./types";

export const CANVAS_LAYOUT_ORPHAN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface CanvasLayoutCleanupOptions {
  now?: Date;
}

export function cloneCanvasLayoutNode(
  node: CanvasLayoutNode
): CanvasLayoutNode {
  return {
    ...(node.label === undefined ? {} : { label: node.label }),
    ...(node.lastSeenUid === undefined
      ? {}
      : { lastSeenUid: node.lastSeenUid }),
    ...(node.orphanedAt === undefined ? {} : { orphanedAt: node.orphanedAt }),
    position: { x: node.position.x, y: node.position.y },
    ref: { ...node.ref },
  };
}

export function cloneCanvasLayoutDocument(
  layout: CanvasLayoutDocument
): CanvasLayoutDocument {
  return {
    namespace: layout.namespace,
    nodes: layout.nodes.map(cloneCanvasLayoutNode),
    ...(layout.projectNameSnapshot === undefined
      ? {}
      : { projectNameSnapshot: layout.projectNameSnapshot }),
    projectUid: layout.projectUid,
    version: layout.version,
  };
}

export function isCanvasLayoutOrphanExpired(
  node: CanvasLayoutNode,
  now: Date
): boolean {
  if (node.orphanedAt === undefined) {
    return false;
  }
  const orphanedAtMs = Date.parse(node.orphanedAt);
  return (
    Number.isFinite(orphanedAtMs) &&
    now.getTime() - orphanedAtMs > CANVAS_LAYOUT_ORPHAN_RETENTION_MS
  );
}

export function cleanupCanvasLayoutDocument(
  layout: CanvasLayoutDocument,
  options?: CanvasLayoutCleanupOptions
): CanvasLayoutDocument {
  const now = options?.now ?? new Date();
  return {
    ...cloneCanvasLayoutDocument(layout),
    nodes: layout.nodes
      .filter((node) => !isCanvasLayoutOrphanExpired(node, now))
      .map(cloneCanvasLayoutNode),
  };
}
