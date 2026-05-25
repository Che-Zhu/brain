import type { Node } from "@xyflow/react";

import { CANVAS_CONTAINER_NODE_TYPE } from "./constants";

const ENTRY_SELECTION_PREFIX = "entry";

export interface CanvasEntrySelectionRef {
  apName: string;
  namespace: string;
}

export function entryPointSelectionKey({
  apName,
  namespace,
}: CanvasEntrySelectionRef): string {
  return [
    ENTRY_SELECTION_PREFIX,
    encodeURIComponent(namespace),
    encodeURIComponent(apName),
  ].join(":");
}

export function entryPointSelectionRefFromKey(
  key: string | null | undefined
): CanvasEntrySelectionRef | null {
  const parts = key?.split(":");
  if (parts?.length !== 3 || parts[0] !== ENTRY_SELECTION_PREFIX) {
    return null;
  }
  let namespace = "";
  let apName = "";
  try {
    namespace = decodeURIComponent(parts[1] ?? "").trim();
    apName = decodeURIComponent(parts[2] ?? "").trim();
  } catch {
    return null;
  }
  if (namespace === "" || apName === "") {
    return null;
  }
  return { apName, namespace };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function nodeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function canvasHasApForEntrySelection(
  nodes: readonly Node[],
  selection: CanvasEntrySelectionRef
): boolean {
  return nodes.some((node) => {
    if (node.type !== CANVAS_CONTAINER_NODE_TYPE) {
      return false;
    }
    const states = asRecord(asRecord(node.data)?.states);
    return (
      nodeString(states?.namespace) === selection.namespace &&
      nodeString(states?.name) === selection.apName
    );
  });
}
