"use client";

import { useApLifecycleOperations } from "@workspace/api/hooks";
import type {
  CanvasMeta,
  CanvasSelectedNode,
} from "@workspace/ui/components/canvas/canvas.types";
import type { Edge, Node } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { CANVAS_CONTAINER_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import type { CanvasContainerNodeData } from "@/lib/project-canvas/nodes/types";
import {
  CANVAS_SERVICE_QUERY_KEY,
  CANVAS_TAB_QUERY_KEY,
  projectCanvasFlowNodeTypes,
  projectCanvasNodeServiceUid,
  projectCanvasWorkloadPanelTabs,
  selectedEdgeAtom,
  WORKLOAD_PANEL_TAB,
} from "@/store/canvas-store";

export interface UseProjectCanvasOptions {
  kubeconfig?: string;
  /** Refetch workload list(s) after PATCH/POST/DELETE lifecycle calls. */
  refreshWorkloadLists?: () => Promise<unknown>;
  shareToken?: string;
}

/**
 * Wires URL-driven workload selection (`?service=`), panel tab (`?tab=`),
 * edge selection (Jotai), node toolbar actions, **AP** lifecycle menu actions, and canvas `meta` for `<Canvas.Root />`.
 */
export function useProjectCanvas(
  rawNodes: Node[],
  options?: UseProjectCanvasOptions
) {
  const [serviceUid, setServiceUid] = useQueryState(
    CANVAS_SERVICE_QUERY_KEY,
    parseAsString
  );
  const [panelTab, setPanelTab] = useQueryState(
    CANVAS_TAB_QUERY_KEY,
    parseAsString.withDefault(WORKLOAD_PANEL_TAB.settings)
  );
  const setSelectedEdge = useSetAtom(selectedEdgeAtom);
  const selectedEdge = useAtomValue(selectedEdgeAtom);

  const {
    authReady,
    deleteWorkload,
    pauseWorkload,
    restartWorkload,
    startWorkload,
  } = useApLifecycleOperations({
    kubeconfig: options?.kubeconfig,
    shareToken: options?.shareToken,
  });

  const refreshWorkloadLists = options?.refreshWorkloadLists;

  const afterLifecycle = useCallback(async () => {
    try {
      await refreshWorkloadLists?.();
    } catch {
      // ignore refresh failures; list will reconcile on next poll
    }
  }, [refreshWorkloadLists]);

  const runMutationThenRefresh = useCallback(
    (
      mutation: () => Promise<unknown>,
      copy: { loading: string; success: string }
    ) => {
      toast.promise(
        (async (): Promise<void> => {
          await mutation();
          try {
            await afterLifecycle();
          } catch {
            //
          }
        })(),
        {
          error: (err) =>
            err instanceof Error ? err.message : "Operation failed",
          loading: copy.loading,
          success: copy.success,
        }
      );
    },
    [afterLifecycle]
  );

  const nodes = useMemo(
    () =>
      rawNodes.map((node): Node => {
        if (node.type !== CANVAS_CONTAINER_NODE_TYPE) {
          return node;
        }
        const data = node.data as CanvasContainerNodeData;
        const states = data.states;
        const uid = states.uid?.trim();
        const ns = states.namespace?.trim() ?? "";
        const name = states.name.trim();

        const isApLifecycle =
          authReady && states.kind === "AP" && ns !== "" && name !== "";

        const hasUrlActions = uid != null && uid !== "";

        if (!(hasUrlActions || isApLifecycle)) {
          return node;
        }

        const select = (tab: string) => {
          setPanelTab(tab).catch(() => undefined);
          setSelectedEdge(null);
          setServiceUid(uid ?? "").catch(() => undefined);
        };

        const ref = { name: states.name, namespace: ns };
        const displayName = states.name;
        const lifecycleActions = isApLifecycle
          ? {
              onDelete: () =>
                runMutationThenRefresh(() => deleteWorkload(ref), {
                  loading: `Deleting "${displayName}"…`,
                  success: `Deleted "${displayName}"`,
                }),
              onPause: () =>
                runMutationThenRefresh(() => pauseWorkload(ref), {
                  loading: `Pausing "${displayName}"…`,
                  success: `Paused "${displayName}"`,
                }),
              onRestart: () =>
                runMutationThenRefresh(() => restartWorkload(ref), {
                  loading: `Restarting "${displayName}"…`,
                  success: `Restarted "${displayName}"`,
                }),
              onStart: () =>
                runMutationThenRefresh(() => startWorkload(ref), {
                  loading: `Starting "${displayName}"…`,
                  success: `Started "${displayName}"`,
                }),
            }
          : {};

        return {
          ...node,
          data: {
            ...data,
            actions: {
              ...(data.actions ?? {}),
              ...(hasUrlActions
                ? {
                    onViewActivity: () => select(WORKLOAD_PANEL_TAB.metrics),
                    onViewLogs: () => select(WORKLOAD_PANEL_TAB.logs),
                  }
                : {}),
              ...lifecycleActions,
            },
          },
        };
      }),
    [
      authReady,
      runMutationThenRefresh,
      deleteWorkload,
      pauseWorkload,
      rawNodes,
      restartWorkload,
      setPanelTab,
      setSelectedEdge,
      setServiceUid,
      startWorkload,
    ]
  );

  const selectedNode = useMemo<CanvasSelectedNode>(() => {
    if (!serviceUid) {
      return null;
    }
    return (
      nodes.find((n) => projectCanvasNodeServiceUid(n) === serviceUid) ?? null
    );
  }, [serviceUid, nodes]);

  const isStale =
    serviceUid != null &&
    serviceUid !== "" &&
    rawNodes.length > 0 &&
    selectedNode == null;

  useEffect(() => {
    if (isStale) {
      setServiceUid(null).catch(() => undefined);
    }
  }, [isStale, setServiceUid]);

  const clearSelection = useMemo(
    () => () => {
      setSelectedEdge(null);
      setServiceUid(null).catch(() => undefined);
    },
    [setSelectedEdge, setServiceUid]
  );

  const meta = useMemo<CanvasMeta>(
    () => ({
      nodeTypes: projectCanvasFlowNodeTypes,
      panelTabSync: { tabValue: panelTab, setTabValue: setPanelTab },
      panelTabs: {
        [CANVAS_CONTAINER_NODE_TYPE]: projectCanvasWorkloadPanelTabs,
      },
      reactFlowProps: {
        onNodeClick: (_, node: Node) => {
          setSelectedEdge(null);
          setServiceUid(projectCanvasNodeServiceUid(node)).catch(
            () => undefined
          );
        },
        onEdgeClick: (_, edge: Edge) => {
          setSelectedEdge(edge);
          setServiceUid(null).catch(() => undefined);
        },
        onPaneClick: () => clearSelection(),
      },
    }),
    [clearSelection, panelTab, setPanelTab, setSelectedEdge, setServiceUid]
  );

  return { clearSelection, meta, nodes, selectedEdge, selectedNode };
}
