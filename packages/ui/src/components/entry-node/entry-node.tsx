"use client";

import {
  EntryNodeContext,
  EntryNodeRoot,
  useEntryNode as useEntryNodeBound,
} from "./entry-node.context";
import { EntryNodeCollapsedBadge } from "./entry-node.primitives";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useEntryNode }`
export { useEntryNode } from "./entry-node.context";
export type {
  EntryNodeDragAngle,
  EntryNodeStates,
  EntryNodeStatus,
  EntryNodeStatusTone,
  EntryNodeValue,
} from "./entry-node.types";

export const EntryNode = Object.assign(EntryNodeCollapsedBadge, {
  CollapsedBadge: EntryNodeCollapsedBadge,
  Context: EntryNodeContext,
  Root: EntryNodeRoot,
  useEntryNode: useEntryNodeBound,
});

const dn = (c: object, name: string) => {
  (c as { displayName?: string }).displayName = name;
};
dn(EntryNodeRoot, "EntryNode.Root");
dn(EntryNodeCollapsedBadge, "EntryNode.CollapsedBadge");
