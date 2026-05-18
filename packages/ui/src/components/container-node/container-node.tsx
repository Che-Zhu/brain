"use client";

import "./container-node.css";

import {
  ContainerNodeActionBar,
  ContainerNodeBodyContent,
  ContainerNodeContent,
  ContainerNodeFooterContent,
  ContainerNodeHeaderContent,
  ContainerNodeImageRow,
} from "./container-node.content";
import {
  ContainerNodeDeleteDialog,
  ContainerNodeDeleteDialogPanel,
} from "./container-node.delete-dialog";
import { ContainerNodeRoot } from "./container-node.root";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useContainerNode }`
export { useContainerNode } from "./container-node.context";
export { ContainerNodeRoot } from "./container-node.root";
export {
  formatContainerMetricValue,
  ContainerNodeActionBar,
  ContainerNodeBodyContent,
  ContainerNodeContent,
  ContainerNodeFooterContent,
  ContainerNodeHeaderContent,
  ContainerNodeImageRow,
} from "./container-node.content";
export {
  ContainerNodeDeleteDialog,
  ContainerNodeDeleteDialogPanel,
} from "./container-node.delete-dialog";
export { containerNodeLifecycleMenuVisibility } from "./container-node.menu-visibility";
export {
  resolveContainerNodeStatus,
  resolveContainerNodeVisualTone,
} from "./container-node.status";
export type {
  ContainerNodeAction,
  ContainerNodeActions,
  ContainerNodeContextValue,
  ContainerNodeLifecycleActionKey,
  ContainerNodeLifecycleActions,
  ContainerNodeMetricKey,
  ContainerNodeMetricValue,
  ContainerNodeProviderProps,
  ContainerNodeQuickActionKey,
  ContainerNodeQuickActions,
  ContainerNodeRootProps,
  ContainerNodeState,
  ContainerNodeStates,
  ContainerNodeStatus,
  ContainerNodeStatusTone,
} from "./container-node.types";
export type {
  ContainerNodeDeleteDialogPanelProps,
  ContainerNodeDeleteDialogProps,
} from "./container-node.delete-dialog";

export const ContainerNode = {
  ActionBar: ContainerNodeActionBar,
  BodyContent: ContainerNodeBodyContent,
  Content: ContainerNodeContent,
  DeleteDialog: ContainerNodeDeleteDialog,
  DeleteDialogPanel: ContainerNodeDeleteDialogPanel,
  FooterContent: ContainerNodeFooterContent,
  HeaderContent: ContainerNodeHeaderContent,
  ImageRow: ContainerNodeImageRow,
  Root: ContainerNodeRoot,
} as const;

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(ContainerNodeRoot, "ContainerNode.Root");
dn(ContainerNodeContent, "ContainerNode.Content");
dn(ContainerNodeHeaderContent, "ContainerNode.HeaderContent");
dn(ContainerNodeBodyContent, "ContainerNode.BodyContent");
dn(ContainerNodeImageRow, "ContainerNode.ImageRow");
dn(ContainerNodeActionBar, "ContainerNode.ActionBar");
dn(ContainerNodeFooterContent, "ContainerNode.FooterContent");
dn(ContainerNodeDeleteDialog, "ContainerNode.DeleteDialog");
dn(ContainerNodeDeleteDialogPanel, "ContainerNode.DeleteDialogPanel");
