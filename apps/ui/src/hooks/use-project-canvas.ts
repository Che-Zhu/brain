"use client";

import {
  useApLifecycleOperations,
  useDbLifecycleOperations,
} from "@workspace/api/hooks";
import type {
  CanvasMeta,
  CanvasSelectedNode,
} from "@workspace/ui/components/canvas/canvas.types";
import type {
  DatabaseNodeCopyConnectionHandler,
  DatabaseNodeTogglePublicConnectionHandler,
} from "@workspace/ui/components/database-node/database-node";
import type { Edge, Node } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "@/lib/project-canvas/nodes/constants";
import type {
  CanvasContainerNodeData,
  CanvasDatabaseNodeData,
} from "@/lib/project-canvas/nodes/types";
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
    authReady: apAuthReady,
    deleteWorkload,
    pauseWorkload,
    restartWorkload,
    startWorkload,
  } = useApLifecycleOperations({
    kubeconfig: options?.kubeconfig,
    shareToken: options?.shareToken,
  });
  const {
    authReady: dbAuthReady,
    isToggling: isDbPublicAccessToggling,
    togglePublicAccess,
  } = useDbLifecycleOperations({
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

  const copyDatabaseConnection = useCallback<DatabaseNodeCopyConnectionHandler>(
    async (connection) => {
      const value = connection.value;
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Copy feedback is handled by the row; clipboard failures should not break canvas interactions.
      }
    },
    []
  );

  const decorateDatabaseNode = useCallback(
    (node: Node): Node => {
      const data = node.data as CanvasDatabaseNodeData;
      const workload = data.workload;
      const name = workload.name.trim();
      const namespace = workload.namespace.trim();
      const canTogglePublicAccess =
        dbAuthReady && name !== "" && namespace !== "";
      const publicAccessLoading = isDbPublicAccessToggling(workload);
      const connections = publicAccessLoading
        ? data.connections.map((connection) =>
            connection.kind === "public"
              ? {
                  ...connection,
                  publicAccess: {
                    ...connection.publicAccess,
                    loading: true,
                  },
                }
              : connection
          )
        : data.connections;
      const togglePublicConnection:
        | DatabaseNodeTogglePublicConnectionHandler
        | undefined = canTogglePublicAccess
        ? (_connection, _index, nextEnabled) => {
            runMutationThenRefresh(
              () => togglePublicAccess(workload, nextEnabled),
              {
                loading: nextEnabled
                  ? `Enabling public access for "${name}"...`
                  : `Disabling public access for "${name}"...`,
                success: nextEnabled
                  ? `Enabled public access for "${name}"`
                  : `Disabled public access for "${name}"`,
              }
            );
          }
        : undefined;

      return {
        ...node,
        data: {
          ...data,
          actions: {
            ...(data.actions ?? {}),
            copyConnection: copyDatabaseConnection,
            ...(togglePublicConnection === undefined
              ? {}
              : { togglePublicConnection }),
          },
          connections,
        },
      };
    },
    [
      copyDatabaseConnection,
      dbAuthReady,
      isDbPublicAccessToggling,
      runMutationThenRefresh,
      togglePublicAccess,
    ]
  );

  const decorateContainerNode = useCallback(
    (node: Node): Node => {
      const data = node.data as CanvasContainerNodeData;
      const states = data.states;
      const uid = states.uid?.trim();
      const ns = states.namespace?.trim() ?? "";
      const name = states.name.trim();

      const isApLifecycle =
        apAuthReady && states.kind === "AP" && ns !== "" && name !== "";

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
    },
    [
      apAuthReady,
      deleteWorkload,
      pauseWorkload,
      restartWorkload,
      runMutationThenRefresh,
      setPanelTab,
      setSelectedEdge,
      setServiceUid,
      startWorkload,
    ]
  );

  const nodes = useMemo(
    () =>
      rawNodes.map((node): Node => {
        if (node.type === CANVAS_DATABASE_NODE_TYPE) {
          return decorateDatabaseNode(node);
        }

        if (node.type === CANVAS_CONTAINER_NODE_TYPE) {
          return decorateContainerNode(node);
        }

        return node;
      }),
    [decorateContainerNode, decorateDatabaseNode, rawNodes]
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
