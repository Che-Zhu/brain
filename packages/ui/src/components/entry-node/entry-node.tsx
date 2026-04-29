"use client";

import { EntryNodeBody } from "./entry-node.body";
import { EntryNodeBounds } from "./entry-node.bounds";
import { EntryNodeCard, EntryNodeDefaultCard } from "./entry-node.card";
import { EntryNodeConnectionButton } from "./entry-node.connection-button";
import { EntryNodeConnectionLayer } from "./entry-node.connection-layer";
import {
  EntryNodeContext,
  useEntryNode as useEntryNodeBound,
} from "./entry-node.context";
import { EntryNodeDefaultView } from "./entry-node.default-view";
import { EntryNodeDomainList } from "./entry-node.domain-list";
import { EntryNodeDomainSection } from "./entry-node.domain-section";
import {
  EntryNodeDragFrame,
  EntryNodeDragStateFrame,
} from "./entry-node.drag-frame";
import { EntryNodeHeader } from "./entry-node.header";
import { EntryNodeProvider } from "./entry-node.provider";
import { EntryNodeRoot } from "./entry-node.root";
import { EntryNodeStatusDot, EntryNodeStatusPill } from "./entry-node.status";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useEntryNode }`
export { useEntryNode } from "./entry-node.context";
export type {
  EntryNodeActions,
  EntryNodeConnectionEvent,
  EntryNodeConnectionSide,
  EntryNodeContextValue,
  EntryNodeDomain,
  EntryNodeDomainKey,
  EntryNodeDomains,
  EntryNodeDragAngle,
  EntryNodeInteractionState,
  EntryNodeMeta,
  EntryNodeProviderProps,
  EntryNodeRootProps,
  EntryNodeState,
  EntryNodeStates,
  EntryNodeStatus,
  EntryNodeStatusTone,
} from "./entry-node.types";

export const EntryNode = Object.assign(EntryNodeRoot, {
  Body: EntryNodeBody,
  Bounds: EntryNodeBounds,
  Card: EntryNodeCard,
  ConnectionButton: EntryNodeConnectionButton,
  ConnectionLayer: EntryNodeConnectionLayer,
  Context: EntryNodeContext,
  DefaultCard: EntryNodeDefaultCard,
  DefaultView: EntryNodeDefaultView,
  DomainList: EntryNodeDomainList,
  DomainSection: EntryNodeDomainSection,
  DragFrame: EntryNodeDragFrame,
  DragStateFrame: EntryNodeDragStateFrame,
  Header: EntryNodeHeader,
  Provider: EntryNodeProvider,
  Root: EntryNodeRoot,
  StatusDot: EntryNodeStatusDot,
  StatusPill: EntryNodeStatusPill,
  useEntryNode: useEntryNodeBound,
});

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(EntryNodeRoot, "EntryNode.Root");
dn(EntryNodeProvider, "EntryNode.Provider");
dn(EntryNodeBounds, "EntryNode.Bounds");
dn(EntryNodeCard, "EntryNode.Card");
dn(EntryNodeDefaultCard, "EntryNode.DefaultCard");
dn(EntryNodeHeader, "EntryNode.Header");
dn(EntryNodeBody, "EntryNode.Body");
dn(EntryNodeDomainList, "EntryNode.DomainList");
dn(EntryNodeConnectionButton, "EntryNode.ConnectionButton");
dn(EntryNodeConnectionLayer, "EntryNode.ConnectionLayer");
dn(EntryNodeDomainSection, "EntryNode.DomainSection");
dn(EntryNodeDragFrame, "EntryNode.DragFrame");
dn(EntryNodeDragStateFrame, "EntryNode.DragStateFrame");
dn(EntryNodeDefaultView, "EntryNode.DefaultView");
