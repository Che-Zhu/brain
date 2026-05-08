"use client";

import {
  EntryNodeAccess,
  EntryNodeContent,
  EntryNodeHeaderContent,
  EntryNodeStatus,
} from "./entry-node.content";
import {
  EntryNodeDomainList,
  EntryNodeDomainSection,
} from "./entry-node.domain";
import { EntryNodeRoot } from "./entry-node.root";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useEntryNode }`
export { useEntryNode } from "./entry-node.context";
export type {
  EntryNodeActions,
  EntryNodeContextValue,
  EntryNodeCopyDomainHandler,
  EntryNodeDomain,
  EntryNodeDomainKey,
  EntryNodeDomains,
  EntryNodeMeta,
  EntryNodeProviderProps,
  EntryNodeRootProps,
  EntryNodeStartConnectionHandler,
  EntryNodeState,
  EntryNodeStates,
} from "./entry-node.types";

export const EntryNode = {
  Access: EntryNodeAccess,
  Content: EntryNodeContent,
  DomainList: EntryNodeDomainList,
  DomainSection: EntryNodeDomainSection,
  HeaderContent: EntryNodeHeaderContent,
  Root: EntryNodeRoot,
  Status: EntryNodeStatus,
} as const;

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(EntryNodeRoot, "EntryNode.Root");
dn(EntryNodeContent, "EntryNode.Content");
dn(EntryNodeHeaderContent, "EntryNode.HeaderContent");
dn(EntryNodeAccess, "EntryNode.Access");
dn(EntryNodeStatus, "EntryNode.Status");
dn(EntryNodeDomainList, "EntryNode.DomainList");
dn(EntryNodeDomainSection, "EntryNode.DomainSection");
