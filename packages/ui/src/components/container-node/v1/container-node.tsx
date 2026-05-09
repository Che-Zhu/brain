"use client";

import {
  ContainerNodeDeleteDialog,
  ContainerNodeDeleteDialogPanel,
} from "./container-node.delete-dialog";
import {
  ContainerNodeHeaderMenuContent,
  ContainerNodeHeaderMenuDelete,
  ContainerNodeHeaderMenuDropdown,
  ContainerNodeHeaderMenuItem,
  ContainerNodeHeaderMenuTrigger,
} from "./container-node.header-menu";
import {
  ContainerNodeToolbarActivity,
  ContainerNodeToolbarCalendar,
  ContainerNodeToolbarLogs,
  ContainerNodeToolbarShell,
} from "./container-node.icon-toolbar";
import {
  ContainerNodeContent,
  ContainerNodeFooter,
  ContainerNodeHeader,
  ContainerNodeHeaderMain,
  ContainerNodeHeaderTitles,
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
import { ContainerNodeVariant1 } from "./container-node.variant1";

export type {
  ContainerNodeActions,
  ContainerNodeStates,
  ContainerNodeStatusTone,
} from "./container-node.types";

export type { ContainerNodeVariant1Props } from "./container-node.variant1";

export const ContainerNode = Object.assign(ContainerNodeShell, {
  Content: ContainerNodeContent,
  DeleteDialog: ContainerNodeDeleteDialog,
  DeleteDialogPanel: ContainerNodeDeleteDialogPanel,
  Footer: ContainerNodeFooter,
  Header: ContainerNodeHeader,
  HeaderMain: ContainerNodeHeaderMain,
  HeaderMenuContent: ContainerNodeHeaderMenuContent,
  HeaderMenuDelete: ContainerNodeHeaderMenuDelete,
  HeaderMenuDropdown: ContainerNodeHeaderMenuDropdown,
  HeaderMenuItem: ContainerNodeHeaderMenuItem,
  HeaderMenuTrigger: ContainerNodeHeaderMenuTrigger,
  HeaderTitles: ContainerNodeHeaderTitles,
  IconPlaceholder: ContainerNodeIconPlaceholder,
  ToolbarActivity: ContainerNodeToolbarActivity,
  ToolbarCalendar: ContainerNodeToolbarCalendar,
  ToolbarLogs: ContainerNodeToolbarLogs,
  ToolbarShell: ContainerNodeToolbarShell,
  Image: ContainerNodeImage,
  Kind: ContainerNodeKind,
  Replicas: ContainerNodeReplicas,
  Resource: ContainerNodeResource,
  ResourceGroup: ContainerNodeResourceGroup,
  ScaleDialog: ContainerNodeScaleDialog,
  ScaleDialogPanel: ContainerNodeScaleDialogPanel,
  Shell: ContainerNodeShell,
  Status: ContainerNodeStatus,
  Title: ContainerNodeTitle,
  Variant1: ContainerNodeVariant1,
});

const dn = (c: object, name: string) => {
  (c as { displayName?: string }).displayName = name;
};
dn(ContainerNodeShell, "ContainerNode.Shell");
dn(ContainerNodeHeader, "ContainerNode.Header");
dn(ContainerNodeHeaderMain, "ContainerNode.HeaderMain");
dn(ContainerNodeHeaderMenuDropdown, "ContainerNode.HeaderMenuDropdown");
dn(ContainerNodeHeaderMenuTrigger, "ContainerNode.HeaderMenuTrigger");
dn(ContainerNodeHeaderMenuContent, "ContainerNode.HeaderMenuContent");
dn(ContainerNodeHeaderMenuItem, "ContainerNode.HeaderMenuItem");
dn(ContainerNodeHeaderMenuDelete, "ContainerNode.HeaderMenuDelete");
dn(ContainerNodeHeaderTitles, "ContainerNode.HeaderTitles");
dn(ContainerNodeContent, "ContainerNode.Content");
dn(ContainerNodeFooter, "ContainerNode.Footer");
dn(ContainerNodeResourceGroup, "ContainerNode.ResourceGroup");
dn(ContainerNodeReplicas, "ContainerNode.Replicas");
dn(ContainerNodeVariant1, "ContainerNode.Variant1");

export type {
  ContainerNodeDeleteDialogPanelProps,
  ContainerNodeDeleteDialogProps,
} from "./container-node.delete-dialog";
export type {
  ContainerNodeScaleDialogPanelProps,
  ContainerNodeScaleDialogProps,
} from "./container-node.scale-dialog";
