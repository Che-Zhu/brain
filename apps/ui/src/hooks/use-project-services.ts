"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
  useDbsK8sList,
} from "@workspace/api/hooks";
import {
  apItemsFromList,
  apNamespaceNameTargetsFromList,
} from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import type { CanvasState } from "@workspace/ui/components/canvas/canvas.types";
import { useCallback, useMemo, useRef } from "react";

import {
  apMetricsLookupFromResults,
  apsToCanvasState,
  dbsToCanvasState,
} from "@/lib/project-canvas/flow/ap-list-to-canvas-state";

const METRICS_REFRESH_MS = 5000;

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
  };
  canvasState: CanvasState;
  error: Error | undefined;
  isLoading: boolean;
} {
  const { kubeconfig, namespace, uid } = options;

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const apsListRef = useRef<K8sGetResponse | undefined>(undefined);
  const dbsListRef = useRef<K8sGetResponse | undefined>(undefined);

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
  } = useApsK8sList({
    kubeconfig,
    labelSelector,
    namespace,
    peerEmpty: peerDbsEmpty,
    pollWhileEmpty: true,
  });

  const {
    data: dbsData,
    error: dbsError,
    isLoading: dbsLoading,
  } = useDbsK8sList({
    kubeconfig,
    labelSelector,
    namespace,
    peerEmpty: peerApsEmpty,
    pollWhileEmpty: true,
  });

  apsListRef.current = apsData;
  dbsListRef.current = dbsData;

  const data = useMemo(
    () => ({ aps: apsData, dbs: dbsData }),
    [apsData, dbsData]
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

  const canvasState = useMemo((): CanvasState => {
    const apBlock = apsToCanvasState(apsData, {
      gridIndexOffset: 0,
      metricsLookup,
      namespaceFallback: namespace,
    });
    const dbBlock = dbsToCanvasState(dbsData, {
      gridIndexOffset: apBlock.nodes.length,
      metricsLookup,
      namespaceFallback: namespace,
    });
    return {
      edges: [...apBlock.edges, ...dbBlock.edges],
      nodes: [...apBlock.nodes, ...dbBlock.nodes],
      selectedEdge: null,
      selectedNode: null,
    };
  }, [apsData, dbsData, namespace, metricsLookup]);

  const error = apsError ?? dbsError;
  const isLoading = apsLoading || dbsLoading;

  return { data, canvasState, error, isLoading };
}
