import type { Node } from "@xyflow/react";

import { CANVAS_DATABASE_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import { CANVAS_ACTION } from "@/store/canvas-store";

export type CanvasActionMode =
  (typeof CANVAS_ACTION)[keyof typeof CANVAS_ACTION];

export function normalizeCanvasActionMode(
  value: string | null | undefined
): CanvasActionMode | null {
  if (value === CANVAS_ACTION.dbAccess) {
    return value;
  }
  return null;
}

export function canvasActionSupportsNode(
  action: CanvasActionMode,
  node: Pick<Node, "type">
): boolean {
  switch (action) {
    case CANVAS_ACTION.dbAccess:
      return node.type === CANVAS_DATABASE_NODE_TYPE;
    default:
      return false;
  }
}

export function shouldClearCanvasActionMode(input: {
  canvasAction: string | null | undefined;
  rawNodeCount: number;
  selectedNode: Pick<Node, "type"> | null;
  serviceUid: string | null | undefined;
}): boolean {
  if (input.canvasAction == null) {
    return false;
  }

  const action = normalizeCanvasActionMode(input.canvasAction);
  if (action == null) {
    return true;
  }
  if (input.serviceUid == null || input.serviceUid === "") {
    return true;
  }
  if (input.selectedNode == null) {
    return input.rawNodeCount > 0;
  }
  return !canvasActionSupportsNode(action, input.selectedNode);
}
