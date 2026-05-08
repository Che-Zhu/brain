"use client";

import {
  ContainerNodeContext,
  ContainerNodeRoot,
  useContainerNode as useContainerNodeBound,
} from "./container-node.context";
import {
  ContainerNodeDeleteDialog,
  ContainerNodeDeleteDialogPanel,
} from "./container-node.delete-dialog";
import { ContainerNodeHeaderMenu } from "./container-node.header-menu";
import {
  ContainerNodeContent,
  ContainerNodeFooter,
  ContainerNodeHeader,
  ContainerNodeResourceGroup,
  ContainerNodeShell,
} from "./container-node.layout";
import {
  ContainerNodeIconPlaceholder,
  ContainerNodeImage,
  ContainerNodeKind,
  ContainerNodeReplicas,
  ContainerNodeResource,
  ContainerNodeStatus,
  ContainerNodeTitle,
} from "./container-node.primitives";
import {
  ContainerNodeScaleDialog,
  ContainerNodeScaleDialogPanel,
} from "./container-node.scale-dialog";
import { ContainerNodeVariant0 } from "./container-node.variant0";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useContainerNode }`
export { useContainerNode } from "./container-node.context";
export type {
  ContainerNodeActions,
  ContainerNodeStates,
  ContainerNodeStatusTone,
  ContainerNodeValue,
} from "./container-node.types";

export const ContainerNode = Object.assign(ContainerNodeShell, {
  Content: ContainerNodeContent,
  Context: ContainerNodeContext,
  DeleteDialog: ContainerNodeDeleteDialog,
  DeleteDialogPanel: ContainerNodeDeleteDialogPanel,
  Footer: ContainerNodeFooter,
  Header: ContainerNodeHeader,
  ResourceGroup: ContainerNodeResourceGroup,
  HeaderMenu: ContainerNodeHeaderMenu,
  IconPlaceholder: ContainerNodeIconPlaceholder,
  Image: ContainerNodeImage,
  Kind: ContainerNodeKind,
  Replicas: ContainerNodeReplicas,
  Resource: ContainerNodeResource,
  Root: ContainerNodeRoot,
  ScaleDialog: ContainerNodeScaleDialog,
  ScaleDialogPanel: ContainerNodeScaleDialogPanel,
  Shell: ContainerNodeShell,
  Status: ContainerNodeStatus,
  Title: ContainerNodeTitle,
  Variant0: ContainerNodeVariant0,
  useContainerNode: useContainerNodeBound,
});

const dn = (c: object, name: string) => {
  (c as { displayName?: string }).displayName = name;
};
dn(ContainerNodeRoot, "ContainerNode.Root");
dn(ContainerNodeVariant0, "ContainerNode.Variant0");
dn(ContainerNodeShell, "ContainerNode.Shell");
dn(ContainerNodeHeader, "ContainerNode.Header");
dn(ContainerNodeContent, "ContainerNode.Content");
dn(ContainerNodeFooter, "ContainerNode.Footer");
dn(ContainerNodeResourceGroup, "ContainerNode.ResourceGroup");
dn(ContainerNodeReplicas, "ContainerNode.Replicas");

export type {
  ContainerNodeDeleteDialogPanelProps,
  ContainerNodeDeleteDialogProps,
} from "./container-node.delete-dialog";
export type {
  ContainerNodeScaleDialogPanelProps,
  ContainerNodeScaleDialogProps,
} from "./container-node.scale-dialog";
