import type { Node } from "@xyflow/react";

import { CANVAS_ENTRY_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import { ENTRY_PANE } from "@/store/canvas-store";

export type EntryPaneMode = (typeof ENTRY_PANE)[keyof typeof ENTRY_PANE];

export function normalizeEntryPaneMode(
  value: string | null | undefined
): EntryPaneMode | null {
  return value === ENTRY_PANE.settings ? value : null;
}

export function entryPaneModeForNodeClick(
  node: Pick<Node, "type">
): EntryPaneMode | null {
  return node.type === CANVAS_ENTRY_NODE_TYPE ? ENTRY_PANE.settings : null;
}
