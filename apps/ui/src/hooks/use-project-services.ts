"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
  useDbsK8sList,
  useEntryPointList,
} from "@workspace/api/hooks";
import {
  apItemsFromList,
  apNamespaceNameTargetsFromList,
} from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import type { CanvasState } from "@workspace/ui/components/canvas/canvas.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDbCompositions } from "@/hooks/compositions/use-db-compositions";

import {
  apMetricsLookupFromResults,
  apsToCanvasState,
  dbsToCanvasState,
  entryPointsToCanvasState,
} from "@/lib/project-canvas/flow/ap-list-to-canvas-state";
import {
  entryPointRefreshIntervalForLifecycle,
  hasTransientWorkloadPhase,
} from "./project-services-refresh";

const METRICS_REFRESH_MS = 5000;
const WORKLOAD_RECONCILE_POLL_MS = 1000;
const WORKLOAD_RECONCILE_POLL_WINDOW_MS = 30_000;

export function useProjectServices(options: {
  /** URL-encoded kubeconfig (Authorization bearer body). */
  kubeconfig: string;
  /** K8s namespace for the AP list and telemetry targets. */
  namespace: string;
  /** Project UID from the route (decoded). */
  uid: string;
}): {
  /** Raw list payloads for canvas-adjacent tooling. */
  data: {
    aps: K8sGetResponse | undefined;
    dbs: K8sGetResponse | undefined;
    entryPoints: K8sGetResponse | undefined;
  };
  canvasState: CanvasState;
  error: Error | undefined;
  /** True only during the initial AP/DB fetch while the graph is still empty — clears when lists settle even if there are zero workloads. */
  isEmptyGraphLoading: boolean;
  isLoading: boolean;
  /** Refetch AP + DB list SWR caches (e.g. after lifecycle mutations). */
  refreshWorkloadLists: () => Promise<unknown>;
} {
  const { kubeconfig, namespace, uid } = options;

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const apsListRef = useRef<K8sGetResponse | undefined>(undefined);
  const dbsListRef = useRef<K8sGetResponse | undefined>(undefined);
  const [workloadReconcilePollUntil, setWorkloadReconcilePollUntil] =
    useState(0);
  const workloadReconcileRefreshInterval = useCallback(
    (latestData: K8sGetResponse | undefined) => {
      if (
        workloadReconcilePollUntil > Date.now() ||
        hasTransientWorkloadPhase(latestData)
      ) {
        return WORKLOAD_RECONCILE_POLL_MS;
      }
      return 0;
    },
    [workloadReconcilePollUntil]
  );

  const peerDbsEmpty = useCallback(
    () => apItemsFromList(dbsListRef.current).length === 0,
    []
  );
  const peerApsEmpty = useCallback(
    () => apItemsFromList(apsListRef.current).length === 0,
    []
  );

  const {
    data: apsData,
    error: apsError,
    isLoading: apsLoading,
    mutate: mutateAps,
  } = useApsK8sList({
    kubeconfig,
    labelSelector,
    namespace,
    peerEmpty: peerDbsEmpty,
    pollWhileEmpty: true,
    refreshInterval: workloadReconcileRefreshInterval,
  });

  const {
    data: dbsData,
    error: dbsError,
    isLoading: dbsLoading,
    mutate: mutateDbs,
  } = useDbsK8sList({
    kubeconfig,
    labelSelector,
    namespace,
    peerEmpty: peerApsEmpty,
    pollWhileEmpty: true,
    refreshInterval: workloadReconcileRefreshInterval,
  });
  const entryPointRefreshInterval = useCallback(
    (latestData: K8sGetResponse | undefined) =>
      entryPointRefreshIntervalForLifecycle({
        apsData,
        entryPointsData: latestData,
        workloadReconcilePollUntil,
      }),
    [apsData, workloadReconcilePollUntil]
  );
  const {
    data: entryPointsData,
    error: entryPointsError,
    isLoading: entryPointsLoading,
    mutate: mutateEntryPoints,
  } = useEntryPointList({
    kubeconfig,
    labelSelector,
    namespace,
    refreshInterval: entryPointRefreshInterval,
  });
  const { items: dbCompositionRows } = useDbCompositions({
    kubeconfig,
    toItems: true,
  });

  apsListRef.current = apsData;
  dbsListRef.current = dbsData;

  const refreshWorkloadLists = useCallback(() => {
    setWorkloadReconcilePollUntil(
      Date.now() + WORKLOAD_RECONCILE_POLL_WINDOW_MS
    );
    return Promise.all([mutateAps(), mutateDbs(), mutateEntryPoints()]);
  }, [mutateAps, mutateDbs, mutateEntryPoints]);

  const data = useMemo(
    () => ({ aps: apsData, dbs: dbsData, entryPoints: entryPointsData }),
    [apsData, dbsData, entryPointsData]
  );

  const apTargets = useMemo(
    () =>
      apNamespaceNameTargetsFromList(apsData, namespace).map((t) => ({
        ...t,
        kind: "ap" as const,
      })),
    [apsData, namespace]
  );

  const dbTargets = useMemo(
    () =>
      apNamespaceNameTargetsFromList(dbsData, namespace).map((t) => ({
        ...t,
        kind: "db" as const,
      })),
    [dbsData, namespace]
  );

  const telemetryTargets = useMemo(
    () => [...apTargets, ...dbTargets],
    [apTargets, dbTargets]
  );

  const { data: telemetryBatch } = useApTelemetryMetricsBatch({
    kubeconfig,
    refreshInterval: METRICS_REFRESH_MS,
    targets: telemetryTargets,
  });

  const metricsLookup = useMemo(
    () => apMetricsLookupFromResults(telemetryBatch),
    [telemetryBatch]
  );
  const dbCompositionIconByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of dbCompositionRows ?? []) {
      const iconUrl = row.iconUrl?.trim();
      if (iconUrl) {
        map.set(row.metadata.compositionName, iconUrl);
      }
    }
    return map;
  }, [dbCompositionRows]);

  const canvasState = useMemo((): CanvasState => {
    const apBlock = apsToCanvasState(apsData, {
      gridIndexOffset: 0,
      metricsLookup,
      namespaceFallback: namespace,
    });
    const dbBlock = dbsToCanvasState(dbsData, {
      compositionIconByName: dbCompositionIconByName,
      gridIndexOffset: apBlock.nodes.length,
      metricsLookup,
      namespaceFallback: namespace,
    });
    const entryPointBlock = entryPointsToCanvasState(entryPointsData, {
      gridIndexOffset: apBlock.nodes.length + dbBlock.nodes.length,
    });
    return {
      edges: [...apBlock.edges, ...dbBlock.edges, ...entryPointBlock.edges],
      nodes: [...apBlock.nodes, ...dbBlock.nodes, ...entryPointBlock.nodes],
      selectedEdge: null,
      selectedNode: null,
    };
  }, [
    apsData,
    dbsData,
    entryPointsData,
    dbCompositionIconByName,
    namespace,
    metricsLookup,
  ]);

  const error = apsError ?? dbsError ?? entryPointsError;
  const isLoading = apsLoading || dbsLoading || entryPointsLoading;
  const graphEmpty =
    canvasState.nodes.length === 0 && canvasState.edges.length === 0;

  // Sticky: once nodes have appeared, never show the bootstrap spinner again.
  // This avoids flicker from `isValidating` oscillating between poll cycles.
  const hasEverHadNodes = useRef(false);
  const projectUidRef = useRef(uid);
  if (projectUidRef.current !== uid) {
    projectUidRef.current = uid;
    hasEverHadNodes.current = false;
  }
  if (!graphEmpty) {
    hasEverHadNodes.current = true;
  }

  // Grace period: `isLoading` clears after the first SWR response, but
  // `pollWhileEmpty` may need several more 1 s cycles for K8s to reconcile.
  // A timeout lets the toast cover that gap without using `isValidating`
  // (which flickers). If nodes appear before the timeout, `hasEverHadNodes`
  // hides the toast immediately.
  const [discoveryTimedOut, setDiscoveryTimedOut] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset timer when project changes
  useEffect(() => {
    setDiscoveryTimedOut(false);
    const t = setTimeout(() => setDiscoveryTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [labelSelector]);

  const isEmptyGraphLoading =
    graphEmpty && !hasEverHadNodes.current && !discoveryTimedOut;

  return {
    data,
    canvasState,
    error,
    isEmptyGraphLoading,
    isLoading,
    refreshWorkloadLists,
  };
}
