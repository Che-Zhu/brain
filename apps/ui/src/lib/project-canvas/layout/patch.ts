import { canvasLayoutResourceKey } from "./merge";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutPatch,
  CanvasLayoutResourceRef,
} from "./types";

export class CanvasLayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasLayoutValidationError";
  }
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new CanvasLayoutValidationError(`${field} is required.`);
  }
  return trimmed;
}

function normalizeRef(ref: CanvasLayoutResourceRef): CanvasLayoutResourceRef {
  return {
    kind: ref.kind,
    name: assertNonEmpty(ref.name, "resource name"),
    namespace: assertNonEmpty(ref.namespace, "resource namespace"),
  };
}

function normalizeNode(node: CanvasLayoutNode): CanvasLayoutNode {
  const x = node.position.x;
  const y = node.position.y;
  if (!(Number.isFinite(x) && Number.isFinite(y))) {
    throw new CanvasLayoutValidationError("node position must be finite.");
  }
  return {
    ...(node.lastSeenUid === undefined
      ? {}
      : { lastSeenUid: node.lastSeenUid }),
    position: { x, y },
    ref: normalizeRef(node.ref),
  };
}

export function applyCanvasLayoutPatch(
  existing: CanvasLayoutDocument,
  patch: CanvasLayoutPatch
): CanvasLayoutDocument {
  const nextByRef = new Map<string, CanvasLayoutNode>();
  const order: string[] = [];

  for (const node of existing.nodes) {
    const normalized = normalizeNode(node);
    const key = canvasLayoutResourceKey(normalized.ref);
    if (!nextByRef.has(key)) {
      order.push(key);
    }
    nextByRef.set(key, normalized);
  }

  for (const node of patch.nodes) {
    const normalized = normalizeNode(node);
    const key = canvasLayoutResourceKey(normalized.ref);
    if (!nextByRef.has(key)) {
      order.push(key);
    }
    nextByRef.set(key, normalized);
  }

  const projectNameSnapshot =
    patch.projectNameSnapshot === undefined
      ? existing.projectNameSnapshot
      : patch.projectNameSnapshot;

  return {
    namespace: assertNonEmpty(existing.namespace, "namespace"),
    nodes: order.flatMap((key) => {
      const node = nextByRef.get(key);
      return node === undefined ? [] : [node];
    }),
    ...(projectNameSnapshot === undefined ? {} : { projectNameSnapshot }),
    projectUid: assertNonEmpty(existing.projectUid, "project UID"),
    version: existing.version + 1,
  };
}
