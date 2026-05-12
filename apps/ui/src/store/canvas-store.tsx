"use client";

import type {
  CanvasMeta,
  CanvasPanelTab,
  CanvasSelectedEdge,
  CanvasSelectedNode,
} from "@workspace/ui/components/canvas/canvas.types";
import type { Edge, Node, NodeTypes } from "@xyflow/react";
import { atom, useSetAtom } from "jotai";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo } from "react";

import { CanvasContainerNode } from "@/lib/project-canvas/nodes/canvas-container-node";
import { CANVAS_CONTAINER_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import { WorkloadLogsCanvasPanel } from "@/lib/project-canvas/panels/workload-logs-panel";
import { WorkloadMetricsCanvasPanel } from "@/lib/project-canvas/panels/workload-metrics-panel";
import { WorkloadSettingsCanvasPanel } from "@/lib/project-canvas/panels/workload-settings-panel";

/**
 * Central wiring for the project canvas. Edit this file to swap node types,
 * register new panel tabs, or change selection behavior.
 *
 * Design:
 * - **Node selection** lives in the URL (`?service=<k8s-uid>`), which is the
 *   single source of truth. We sync the underlying resource's `metadata.uid`
 *   rather than the React Flow node id so links survive rename-style edits
 *   and stay stable per resource. `selectedNode` is derived from URL + `nodes`
 *   via {@link useSelectedCanvasNode}. Deep links, browser back/forward, and
 *   the panel close button all work without bidirectional sync between an
 *   atom and the URL.
 * - **Edge selection** is local-only (`selectedEdgeAtom`) — edges don't deep
 *   link.
 * - Click handlers and selection setters live on hooks so they can talk to
 *   nuqs.
 */

// -- URL key ------------------------------------------------------------------

/** nuqs key for the selected workload card (Kubernetes `metadata.uid`). */
export const CANVAS_SERVICE_QUERY_KEY = "service" as const;

/** Reads {@link ContainerNodeStates.uid} from the node's `data.states`. */
function nodeServiceUid(node: Node): string | null {
  const data = node.data as { states?: { uid?: unknown } } | undefined;
  const uid = data?.states?.uid;
  return typeof uid === "string" && uid !== "" ? uid : null;
}

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

// -- Edge selection (local-only) ----------------------------------------------

/** Transient: currently selected canvas edge (no URL sync). */
export const selectedEdgeAtom = atom<CanvasSelectedEdge>(null);

// -- Selection hooks ----------------------------------------------------------

function useServiceQuery() {
  return useQueryState(CANVAS_SERVICE_QUERY_KEY, parseAsString);
}

/**
 * Selected workload node derived from `?service=<uid>` + the current `nodes`
 * list (matched by `data.uid`). Drops stale uids when the URL references a
 * resource that no longer exists in the list.
 */
export function useSelectedCanvasNode(nodes: Node[]): CanvasSelectedNode {
  const [serviceUid, setServiceUid] = useServiceQuery();

  const selectedNode = useMemo<CanvasSelectedNode>(() => {
    if (serviceUid == null || serviceUid === "") {
      return null;
    }
    return nodes.find((n) => nodeServiceUid(n) === serviceUid) ?? null;
  }, [serviceUid, nodes]);

  const isStale =
    serviceUid != null &&
    serviceUid !== "" &&
    nodes.length > 0 &&
    selectedNode == null;

  useEffect(() => {
    if (isStale) {
      setServiceUid(null).catch(() => undefined);
    }
  }, [isStale, setServiceUid]);

  return selectedNode;
}

export interface CanvasSelectionActions {
  /** Clear both node and edge selection (e.g. panel close button). */
  clearSelection: () => void;
  /** Select an edge (clears node URL). */
  selectEdge: (edge: Edge) => void;
  /** Select a node (URL becomes `?service=<node.id>`, edge is cleared). */
  selectNode: (node: Node) => void;
}

/**
 * Imperative selection setters wired to the URL (node) + edge atom.
 * Stable across renders so callers — including {@link useCanvasMeta} — don't
 * thrash the canvas provider memo.
 */
export function useCanvasSelectionActions(): CanvasSelectionActions {
  const [, setServiceUid] = useServiceQuery();
  const setSelectedEdge = useSetAtom(selectedEdgeAtom);

  return useMemo<CanvasSelectionActions>(
    () => ({
      clearSelection() {
        setSelectedEdge(null);
        setServiceUid(null).catch(() => undefined);
      },
      selectEdge(edge) {
        setSelectedEdge(edge);
        setServiceUid(null).catch(() => undefined);
      },
      selectNode(node) {
        setSelectedEdge(null);
        setServiceUid(nodeServiceUid(node)).catch(() => undefined);
      },
    }),
    [setSelectedEdge, setServiceUid]
  );
}

// -- Canvas meta --------------------------------------------------------------

/**
 * Canvas `meta` (`nodeTypes`, `panelTabs`, `reactFlowProps`) with click
 * handlers bound to {@link useCanvasSelectionActions}. Use alongside
 * {@link useSelectedCanvasNode} and `selectedEdgeAtom` to feed `<Canvas.Root />`.
 */
export function useCanvasMeta(): CanvasMeta {
  const { clearSelection, selectEdge, selectNode } =
    useCanvasSelectionActions();
  return useMemo<CanvasMeta>(
    () => ({
      nodeTypes,
      panelTabs: {
        [CANVAS_CONTAINER_NODE_TYPE]: workloadPanelTabs,
      },
      reactFlowProps: {
        onNodeClick: (_event, node: Node) => selectNode(node),
        onEdgeClick: (_event, edge: Edge) => selectEdge(edge),
        onPaneClick: () => clearSelection(),
      },
    }),
    [clearSelection, selectEdge, selectNode]
  );
}
