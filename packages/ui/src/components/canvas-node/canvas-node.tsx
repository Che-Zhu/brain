"use client";

import "./canvas-node.css";

import {
  CanvasNodeActionBar,
  CanvasNodeActionButton,
  CanvasNodeActionMenu,
  CanvasNodeActionMenuItem,
} from "./canvas-node.actions";
import { CanvasNodeCard } from "./canvas-node.card";
import {
  CanvasNodeConnectionButton,
  CanvasNodeConnectionLayer,
} from "./canvas-node.connection";
import {
  CanvasNodeCopyableRow,
  CanvasNodeCopyableRowControl,
  CanvasNodeCopyableRowIndicator,
  CanvasNodeCopyFeedbackScope,
} from "./canvas-node.copyable-row";
import {
  CanvasNodeDragFrame,
  CanvasNodeDragStateFrame,
} from "./canvas-node.drag-frame";
import { CanvasNodeExpandButton } from "./canvas-node.expand-button";
import { CanvasNodeFrame } from "./canvas-node.frame";
import {
  CanvasNodeBody,
  CanvasNodeFooter,
  CanvasNodeHeader,
} from "./canvas-node.layout";
import {
  CanvasNodeFooterStatus,
  CanvasNodeMetric,
  CanvasNodeMetrics,
} from "./canvas-node.metrics";
import { CanvasNodeRoot } from "./canvas-node.root";
import {
  CanvasNodeStatus,
  CanvasNodeStatusDot,
  CanvasNodeStatusPill,
} from "./canvas-node.status";
import { CanvasNodeSurface } from "./canvas-node.surface";

export type {
  CanvasNodeCopyableRowKey,
  CanvasNodeCopyableRowProps,
  CanvasNodeCopyableRowState,
  CanvasNodeCopyFeedbackScopeProps,
  CanvasNodeCopyFeedbackValue,
} from "./canvas-node.copyable-row";
export type {
  CanvasNodeActions,
  CanvasNodeConnectionEvent,
  CanvasNodeConnectionSide,
  CanvasNodeContextValue,
  CanvasNodeInteractionState,
  CanvasNodeMeta,
  CanvasNodeProviderProps,
  CanvasNodeRootProps,
  CanvasNodeState,
  CanvasNodeStatus,
  CanvasNodeVisualStatusTone,
} from "./canvas-node.types";

export const CanvasNode = {
  ActionBar: CanvasNodeActionBar,
  ActionButton: CanvasNodeActionButton,
  ActionMenu: CanvasNodeActionMenu,
  ActionMenuItem: CanvasNodeActionMenuItem,
  Body: CanvasNodeBody,
  Card: CanvasNodeCard,
  ConnectionButton: CanvasNodeConnectionButton,
  ConnectionLayer: CanvasNodeConnectionLayer,
  CopyableRow: CanvasNodeCopyableRow,
  CopyableRowControl: CanvasNodeCopyableRowControl,
  CopyableRowIndicator: CanvasNodeCopyableRowIndicator,
  CopyFeedbackScope: CanvasNodeCopyFeedbackScope,
  DragFrame: CanvasNodeDragFrame,
  DragStateFrame: CanvasNodeDragStateFrame,
  ExpandButton: CanvasNodeExpandButton,
  Frame: CanvasNodeFrame,
  Footer: CanvasNodeFooter,
  FooterStatus: CanvasNodeFooterStatus,
  Header: CanvasNodeHeader,
  Metric: CanvasNodeMetric,
  Metrics: CanvasNodeMetrics,
  Root: CanvasNodeRoot,
  Status: CanvasNodeStatus,
  StatusDot: CanvasNodeStatusDot,
  StatusPill: CanvasNodeStatusPill,
  Surface: CanvasNodeSurface,
} as const;

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(CanvasNodeRoot, "CanvasNode.Root");
dn(CanvasNodeActionBar, "CanvasNode.ActionBar");
dn(CanvasNodeActionButton, "CanvasNode.ActionButton");
dn(CanvasNodeActionMenu, "CanvasNode.ActionMenu");
dn(CanvasNodeActionMenuItem, "CanvasNode.ActionMenuItem");
dn(CanvasNodeFrame, "CanvasNode.Frame");
dn(CanvasNodeSurface, "CanvasNode.Surface");
dn(CanvasNodeHeader, "CanvasNode.Header");
dn(CanvasNodeBody, "CanvasNode.Body");
dn(CanvasNodeCard, "CanvasNode.Card");
dn(CanvasNodeFooter, "CanvasNode.Footer");
dn(CanvasNodeFooterStatus, "CanvasNode.FooterStatus");
dn(CanvasNodeMetric, "CanvasNode.Metric");
dn(CanvasNodeMetrics, "CanvasNode.Metrics");
dn(CanvasNodeConnectionLayer, "CanvasNode.ConnectionLayer");
dn(CanvasNodeConnectionButton, "CanvasNode.ConnectionButton");
dn(CanvasNodeCopyFeedbackScope, "CanvasNode.CopyFeedbackScope");
dn(CanvasNodeCopyableRow, "CanvasNode.CopyableRow");
dn(CanvasNodeCopyableRowControl, "CanvasNode.CopyableRowControl");
dn(CanvasNodeCopyableRowIndicator, "CanvasNode.CopyableRowIndicator");
dn(CanvasNodeExpandButton, "CanvasNode.ExpandButton");
dn(CanvasNodeDragFrame, "CanvasNode.DragFrame");
dn(CanvasNodeDragStateFrame, "CanvasNode.DragStateFrame");
dn(CanvasNodeStatus, "CanvasNode.Status");
dn(CanvasNodeStatusDot, "CanvasNode.StatusDot");
dn(CanvasNodeStatusPill, "CanvasNode.StatusPill");
