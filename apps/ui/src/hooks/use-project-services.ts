"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
} from "@workspace/api/hooks";
import { apNamespaceNameTargetsFromList } from "@workspace/api/lib/ap-list";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import type { CanvasState } from "@workspace/ui/components/canvas/canvas.types";
import { useMemo } from "react";

import {
  apMetricsLookupFromResults,
  apsToCanvasState,
} from "@/lib/ap-to-canvas-state";

const METRICS_REFRESH_MS = 5000;

export type UseProjectServicesAuth =
  | { type: "kubeconfig"; kubeconfig: string }
  | { type: "share"; shareToken: string };

export function useProjectServices(options: {
  auth: UseProjectServicesAuth;
  /** K8s namespace for the AP list and telemetry targets. */
  namespace: string;
  /** Project UID from the route (decoded). */
  uid: string;
}): {
  canvasState: CanvasState;
  error: Error | undefined;
  isLoading: boolean;
} {
  const { auth, namespace, uid } = options;

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const listArgs =
    auth.type === "kubeconfig"
      ? {
          kubeconfig: auth.kubeconfig,
          labelSelector,
          namespace,
        }
      : {
          labelSelector,
          namespace,
          shareToken:
            auth.shareToken.trim() === "" ? undefined : auth.shareToken.trim(),
        };

  const { data, error, isLoading } = useApsK8sList(listArgs);

  const apMetricsTargets = useMemo(
    () => apNamespaceNameTargetsFromList(data, namespace),
    [data, namespace]
  );

  const metricsArgs =
    auth.type === "kubeconfig"
      ? {
          kubeconfig: auth.kubeconfig,
          refreshInterval: METRICS_REFRESH_MS,
          targets: apMetricsTargets,
        }
      : {
          refreshInterval: METRICS_REFRESH_MS,
          shareToken:
            auth.shareToken.trim() === "" ? undefined : auth.shareToken.trim(),
          targets: apMetricsTargets,
        };

  const { data: apMetrics } = useApTelemetryMetricsBatch(metricsArgs);

  const metricsLookup = useMemo(
    () => apMetricsLookupFromResults(apMetrics),
    [apMetrics]
  );

  const canvasState = useMemo((): CanvasState => {
    const { edges, nodes } = apsToCanvasState(data, {
      metricsLookup,
      namespaceFallback: namespace,
    });
    return { edges, nodes };
  }, [data, namespace, metricsLookup]);

  return { canvasState, error, isLoading };
}
