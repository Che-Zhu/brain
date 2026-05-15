"use client";

import "./entry-node.css";

import {
  EntryNodeAccess,
  EntryNodeContent,
  EntryNodeHeaderContent,
  EntryNodeStatus,
} from "./entry-node.content";
import { EntryNodeRoot } from "./entry-node.root";
import { EntryNodeTargetList, EntryNodeTargetRow } from "./entry-node.target";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useEntryNode }`
export { useEntryNode } from "./entry-node.context";
export {
  resolveEntryNodeTargetStatus,
  resolveEntryNodeTargetVisualStatus,
} from "./entry-node.status";
export type {
  EntryNodeAccessDomain,
  EntryNodeActions,
  EntryNodeContextValue,
  EntryNodeCopyTargetHandler,
  EntryNodeMeta,
  EntryNodeProviderProps,
  EntryNodeRootProps,
  EntryNodeState,
  EntryNodeStates,
  EntryNodeTarget,
  EntryNodeTargetKey,
  EntryNodeTargetStatus,
  EntryNodeTargetStatusTone,
} from "./entry-node.types";

export const EntryNode = {
  Access: EntryNodeAccess,
  Content: EntryNodeContent,
  HeaderContent: EntryNodeHeaderContent,
  Root: EntryNodeRoot,
  Status: EntryNodeStatus,
  TargetList: EntryNodeTargetList,
  TargetRow: EntryNodeTargetRow,
} as const;

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(EntryNodeRoot, "EntryNode.Root");
dn(EntryNodeContent, "EntryNode.Content");
dn(EntryNodeHeaderContent, "EntryNode.HeaderContent");
dn(EntryNodeAccess, "EntryNode.Access");
dn(EntryNodeStatus, "EntryNode.Status");
dn(EntryNodeTargetList, "EntryNode.TargetList");
dn(EntryNodeTargetRow, "EntryNode.TargetRow");
