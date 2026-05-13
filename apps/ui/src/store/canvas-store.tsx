"use client";

import type {
  CanvasPanelTab,
  CanvasSelectedEdge,
} from "@workspace/ui/components/canvas/canvas.types";
import type { Node, NodeTypes } from "@xyflow/react";
import { atom } from "jotai";

import { CanvasContainerNode } from "@/lib/project-canvas/nodes/canvas-container-node";
import { CANVAS_CONTAINER_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import { WorkloadLogsCanvasPanel } from "@/lib/project-canvas/panels/workload-logs-panel";
import { WorkloadMetricsCanvasPanel } from "@/lib/project-canvas/panels/workload-metrics-panel";
import { WorkloadSettingsCanvasPanel } from "@/lib/project-canvas/panels/workload-settings-panel";

/** nuqs key for the selected workload card (Kubernetes `metadata.uid`). */
export const CANVAS_SERVICE_QUERY_KEY = "service" as const;

/** nuqs key for the workload panel tab (`?tab=…`); value matches panel tab {@link CanvasPanelTab.name}. */
export const CANVAS_TAB_QUERY_KEY = "tab" as const;

/** Tab `name` values — doubles as Radix tab value and URL `?tab=…` value. */
export const WORKLOAD_PANEL_TAB = {
  settings: "Settings",
  metrics: "Metrics",
  logs: "Logs",
} as const;

/**
 * Bounds for AP `spec.replicas` in the workload Settings panel (`ContainerSettingsPane`).
 * Matches `packages/crossplane/public/service/ap/ap.yaml` (`minimum` / `maximum`).
 */
export const WORKLOAD_PANEL_REPLICAS = { min: 1, max: 20 } as const;

export function projectCanvasNodeServiceUid(node: Node): string | null {
  const data = node.data as { states?: { uid?: unknown } } | undefined;
  const uid = data?.states?.uid;
  return typeof uid === "string" && uid !== "" ? uid : null;
}

export const projectCanvasFlowNodeTypes = {
  [CANVAS_CONTAINER_NODE_TYPE]: CanvasContainerNode,
} as const satisfies NodeTypes;

/** Side-panel tabs for the project canvas workload inspector (Settings uses {@link WORKLOAD_PANEL_REPLICAS}). */
export const projectCanvasWorkloadPanelTabs: CanvasPanelTab[] = [
  {
    name: WORKLOAD_PANEL_TAB.settings,
    render: ({ node }) => (
      <WorkloadSettingsCanvasPanel key={node.id} node={node} />
    ),
  },
  {
    name: WORKLOAD_PANEL_TAB.metrics,
    render: ({ node }) => (
      <WorkloadMetricsCanvasPanel key={node.id} node={node} />
    ),
  },
  {
    name: WORKLOAD_PANEL_TAB.logs,
    render: () => <WorkloadLogsCanvasPanel />,
  },
];

export const selectedEdgeAtom = atom<CanvasSelectedEdge>(null);
