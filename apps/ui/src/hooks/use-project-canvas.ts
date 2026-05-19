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
  DatabaseNodeLifecycleActionKey,
  DatabaseNodeTogglePublicConnectionHandler,
} from "@workspace/ui/components/database-node/database-node";
import type { Edge, Node } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { resolveDatabasePublicConnections } from "@/lib/project-canvas/flow/database-public-connection";
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
  DATABASE_PANE,
  DATABASE_PANE_QUERY_KEY,
  projectCanvasFlowNodeTypes,
  projectCanvasNodeServiceUid,
  projectCanvasWorkloadPanelTabs,
  selectedEdgeAtom,
  WORKLOAD_PANEL_TAB,
} from "@/store/canvas-store";

export interface UseProjectCanvasOptions {
  kubeconfig?: string;
  onNodePositionChange?: (node: Node) => void;
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
  const [databasePane, setDatabasePane] = useQueryState(
    DATABASE_PANE_QUERY_KEY,
    parseAsString
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
    clearPublicAccessPendingTarget,
    deleteWorkload: deleteDbWorkload,
    getPublicAccessPendingTarget,
    isLoading: isDbLifecycleLoading,
    restartWorkload: restartDbWorkload,
    startWorkload: startDbWorkload,
    stopWorkload: stopDbWorkload,
    togglePublicAccess,
  } = useDbLifecycleOperations({
    kubeconfig: options?.kubeconfig,
    shareToken: options?.shareToken,
  });

  const refreshWorkloadLists = options?.refreshWorkloadLists;
  const onNodePositionChange = options?.onNodePositionChange;

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
      copy: { loading: string; success: string },
      options?: { onSettled?: () => void }
    ) => {
      toast.promise(
        (async (): Promise<void> => {
          try {
            await mutation();
            try {
              await afterLifecycle();
            } catch {
              //
            }
          } finally {
            options?.onSettled?.();
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
      const canUseLifecycle = dbAuthReady && name !== "" && namespace !== "";
      const publicAccessPendingTarget = getPublicAccessPendingTarget(workload);
      const connections = resolveDatabasePublicConnections(
        data.connections,
        publicAccessPendingTarget
      );
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
              },
              {
                onSettled: () => clearPublicAccessPendingTarget(workload),
              }
            );
          }
        : undefined;
      const dbLifecycleAction = (
        action: DatabaseNodeLifecycleActionKey,
        mutation: () => Promise<unknown>,
        copy: { loading: string; success: string }
      ) => ({
        loading: isDbLifecycleLoading(workload, action),
        onClick: () => runMutationThenRefresh(mutation, copy),
      });
      const displayName = data.states.name || name;
      const uid = data.uid?.trim();
      const hasUrlActions = uid != null && uid !== "";
      const lifecycleActions = canUseLifecycle
        ? {
            delete: dbLifecycleAction(
              "delete",
              () => deleteDbWorkload(workload),
              {
                loading: `Deleting "${displayName}"...`,
                success: `Deleted "${displayName}"`,
              }
            ),
            restart: dbLifecycleAction(
              "restart",
              () => restartDbWorkload(workload),
              {
                loading: `Restarting "${displayName}"...`,
                success: `Restart requested for "${displayName}"`,
              }
            ),
            start: dbLifecycleAction("start", () => startDbWorkload(workload), {
              loading: `Starting "${displayName}"...`,
              success: `Start requested for "${displayName}"`,
            }),
            stop: dbLifecycleAction("stop", () => stopDbWorkload(workload), {
              loading: `Stopping "${displayName}"...`,
              success: `Stop requested for "${displayName}"`,
            }),
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
            ...(lifecycleActions === undefined ? {} : { lifecycleActions }),
            quickActions: {
              ...(data.actions?.quickActions ?? {}),
              metrics: {
                disabled: !hasUrlActions,
                onClick: hasUrlActions
                  ? () => {
                      setSelectedEdge(null);
                      setServiceUid(uid).catch(() => undefined);
                      setDatabasePane(DATABASE_PANE.metrics).catch(
                        () => undefined
                      );
                    }
                  : undefined,
              },
            },
          },
          connections,
        },
      };
    },
    [
      copyDatabaseConnection,
      clearPublicAccessPendingTarget,
      dbAuthReady,
      deleteDbWorkload,
      getPublicAccessPendingTarget,
      isDbLifecycleLoading,
      restartDbWorkload,
      runMutationThenRefresh,
      setDatabasePane,
      startDbWorkload,
      stopDbWorkload,
      setSelectedEdge,
      setServiceUid,
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
            delete: {
              onClick: () =>
                runMutationThenRefresh(() => deleteWorkload(ref), {
                  loading: `Deleting "${displayName}"...`,
                  success: `Deleted "${displayName}"`,
                }),
            },
            restart: {
              onClick: () =>
                runMutationThenRefresh(() => restartWorkload(ref), {
                  loading: `Restarting "${displayName}"...`,
                  success: `Restarted "${displayName}"`,
                }),
            },
            start: {
              onClick: () =>
                runMutationThenRefresh(() => startWorkload(ref), {
                  loading: `Starting "${displayName}"...`,
                  success: `Started "${displayName}"`,
                }),
            },
            stop: {
              onClick: () =>
                runMutationThenRefresh(() => pauseWorkload(ref), {
                  loading: `Stopping "${displayName}"...`,
                  success: `Stop requested for "${displayName}"`,
                }),
            },
          }
        : undefined;
      const quickActions = {
        ...(data.actions?.quickActions ?? {}),
        calendar: {
          disabled: !hasUrlActions,
          onClick: hasUrlActions
            ? () => select(WORKLOAD_PANEL_TAB.history)
            : undefined,
        },
        console: {
          disabled: true,
        },
        logs: {
          disabled: !hasUrlActions,
          onClick: hasUrlActions
            ? () => select(WORKLOAD_PANEL_TAB.logs)
            : undefined,
        },
        metrics: {
          disabled: !hasUrlActions,
          onClick: hasUrlActions
            ? () => select(WORKLOAD_PANEL_TAB.metrics)
            : undefined,
        },
      };

      return {
        ...node,
        data: {
          ...data,
          onWorkloadMutation: afterLifecycle,
          actions: {
            ...(data.actions ?? {}),
            ...(lifecycleActions === undefined ? {} : { lifecycleActions }),
            quickActions,
          },
        },
      };
    },
    [
      apAuthReady,
      afterLifecycle,
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

  useEffect(() => {
    if (
      databasePane === DATABASE_PANE.metrics &&
      (serviceUid == null ||
        serviceUid === "" ||
        (selectedNode == null && rawNodes.length > 0) ||
        (selectedNode != null &&
          selectedNode.type !== CANVAS_DATABASE_NODE_TYPE))
    ) {
      setDatabasePane(null).catch(() => undefined);
    }
  }, [
    databasePane,
    rawNodes.length,
    selectedNode,
    serviceUid,
    setDatabasePane,
  ]);

  const clearSelection = useMemo(
    () => () => {
      setSelectedEdge(null);
      setServiceUid(null).catch(() => undefined);
      setDatabasePane(null).catch(() => undefined);
    },
    [setDatabasePane, setSelectedEdge, setServiceUid]
  );

  const closeDatabasePane = useMemo(
    () => () => {
      setSelectedEdge(null);
      setServiceUid(null).catch(() => undefined);
      setDatabasePane(null).catch(() => undefined);
    },
    [setDatabasePane, setSelectedEdge, setServiceUid]
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
          if (node.type !== CANVAS_DATABASE_NODE_TYPE) {
            setDatabasePane(null).catch(() => undefined);
          }
          setServiceUid(projectCanvasNodeServiceUid(node)).catch(
            () => undefined
          );
        },
        onEdgeClick: (_, edge: Edge) => {
          setSelectedEdge(edge);
          setServiceUid(null).catch(() => undefined);
          setDatabasePane(null).catch(() => undefined);
        },
        onNodeDragStop: (_, node: Node) => {
          onNodePositionChange?.(node);
        },
        onPaneClick: () => clearSelection(),
      },
    }),
    [
      clearSelection,
      onNodePositionChange,
      panelTab,
      setDatabasePane,
      setPanelTab,
      setSelectedEdge,
      setServiceUid,
    ]
  );

  return {
    clearSelection,
    closeDatabasePane,
    databasePane,
    meta,
    nodes,
    selectedEdge,
    selectedNode,
  };
}
