"use client";

import "./canvas-node.css";

import {
  CanvasNodeConnectionButton,
  CanvasNodeConnectionLayer,
} from "./canvas-node.connection";
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
import { CanvasNodeRoot } from "./canvas-node.root";
import {
  CanvasNodeStatus,
  CanvasNodeStatusDot,
  CanvasNodeStatusPill,
} from "./canvas-node.status";
import { CanvasNodeSurface } from "./canvas-node.surface";

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
  CanvasNodeStatusTone,
} from "./canvas-node.types";

export const CanvasNode = {
  Body: CanvasNodeBody,
  ConnectionButton: CanvasNodeConnectionButton,
  ConnectionLayer: CanvasNodeConnectionLayer,
  DragFrame: CanvasNodeDragFrame,
  DragStateFrame: CanvasNodeDragStateFrame,
  ExpandButton: CanvasNodeExpandButton,
  Frame: CanvasNodeFrame,
  Footer: CanvasNodeFooter,
  Header: CanvasNodeHeader,
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
dn(CanvasNodeFrame, "CanvasNode.Frame");
dn(CanvasNodeSurface, "CanvasNode.Surface");
dn(CanvasNodeHeader, "CanvasNode.Header");
dn(CanvasNodeBody, "CanvasNode.Body");
dn(CanvasNodeFooter, "CanvasNode.Footer");
dn(CanvasNodeConnectionLayer, "CanvasNode.ConnectionLayer");
dn(CanvasNodeConnectionButton, "CanvasNode.ConnectionButton");
dn(CanvasNodeExpandButton, "CanvasNode.ExpandButton");
dn(CanvasNodeDragFrame, "CanvasNode.DragFrame");
dn(CanvasNodeDragStateFrame, "CanvasNode.DragStateFrame");
dn(CanvasNodeStatus, "CanvasNode.Status");
dn(CanvasNodeStatusDot, "CanvasNode.StatusDot");
dn(CanvasNodeStatusPill, "CanvasNode.StatusPill");
