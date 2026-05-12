"use client";

import type {
  CanvasMeta,
  CanvasPanelTab,
  CanvasSelectedEdge,
  CanvasSelectedNode,
} from "@workspace/ui/components/canvas/canvas.types";
import type { Edge, Node, NodeTypes } from "@xyflow/react";
import { atom, getDefaultStore } from "jotai";

import { CanvasContainerNode } from "@/lib/project-canvas/nodes/canvas-container-node";
import { CANVAS_CONTAINER_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import { WorkloadLogsCanvasPanel } from "@/lib/project-canvas/panels/workload-logs-panel";
import { WorkloadMetricsCanvasPanel } from "@/lib/project-canvas/panels/workload-metrics-panel";
import { WorkloadSettingsCanvasPanel } from "@/lib/project-canvas/panels/workload-settings-panel";

/**
 * Central wiring for the project canvas. Edit this file to swap node types,
 * register new panel tabs, or change selection behavior — implementations
 * live under `@/lib/project-canvas/*` and are intentionally leaf-level so
 * this hub stays small and configurable.
 */

// -- React Flow node registry -------------------------------------------------

/** Map of `node.type` → React Flow node component. Extend here to add new shapes. */
const nodeTypes = {
  [CANVAS_CONTAINER_NODE_TYPE]: CanvasContainerNode,
} as const satisfies NodeTypes;

// -- Side-panel tabs ----------------------------------------------------------

/**
 * Tabbed bodies shown in the canvas side panel when a workload node is selected.
 * Add / reorder / replace tabs here without touching the panel components.
 */
const workloadPanelTabs: CanvasPanelTab[] = [
  {
    name: "Settings",
    render: ({ node }) => (
      <WorkloadSettingsCanvasPanel key={node.id} node={node} />
    ),
  },
  {
    name: "Metrics",
    render: ({ node }) => (
      <WorkloadMetricsCanvasPanel key={node.id} node={node} />
    ),
  },
  {
    name: "Logs",
    render: () => <WorkloadLogsCanvasPanel />,
  },
];

// -- Selection state ----------------------------------------------------------

/** Selected canvas node; `canvasMetaAtom` click handlers write via `getDefaultStore()`. */
export const selectedNodeAtom = atom<CanvasSelectedNode>(null);

/** Selected canvas edge; mutually exclusive with {@link selectedNodeAtom}. */
export const selectedEdgeAtom = atom<CanvasSelectedEdge>(null);

function setCanvasSelection(
  node: CanvasSelectedNode,
  edge: CanvasSelectedEdge
) {
  const store = getDefaultStore();
  store.set(selectedNodeAtom, node);
  store.set(selectedEdgeAtom, edge);
}

/** Clears node and edge selection (e.g. closing the canvas panel). */
export function closeCanvasSelection() {
  setCanvasSelection(null, null);
}

// -- Canvas meta --------------------------------------------------------------

/**
 * Canvas `meta` (`nodeTypes`, `panelTabs`, `reactFlowProps`) — not fetch-derived `state`.
 * Single source of truth for what the canvas knows how to render and how it reacts to clicks.
 */
export const canvasMetaAtom = atom<CanvasMeta>({
  nodeTypes,
  panelTabs: {
    [CANVAS_CONTAINER_NODE_TYPE]: workloadPanelTabs,
  },
  reactFlowProps: {
    onNodeClick: (_event, node: Node) => {
      setCanvasSelection(node, null);
    },
    onEdgeClick: (_event, edge: Edge) => {
      setCanvasSelection(null, edge);
    },
    onPaneClick: () => {
      setCanvasSelection(null, null);
    },
  },
});
