"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
} from "@workspace/api/hooks";
import { apNamespaceNameTargetsFromList } from "@workspace/api/lib/ap-list";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { ProjectFlow } from "@workspace/ui/components/project-flow/project-flow";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  apMetricsLookupFromResults,
  apsToProjectFlowState,
} from "@/lib/ap-to-project-flow";

/**
 * Client-only: fetches AP list + metrics. Share access is checked in `layout.tsx`.
 */
export default function PreviewProjectPage() {
  const params = useParams<{ uid: string }>();
  const searchParams = useSearchParams();
  const uid = decodeURIComponent(params.uid ?? "");
  const ns = (searchParams.get("ns") ?? "").trim();
  const shareToken = (searchParams.get("shareToken") ?? "").trim();

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const { data, error, isLoading } = useApsK8sList({
    labelSelector,
    namespace: ns,
    shareToken: shareToken === "" ? undefined : shareToken,
  });

  const apMetricsTargets = useMemo(
    () => apNamespaceNameTargetsFromList(data, ns),
    [data, ns]
  );

  const { data: apMetrics } = useApTelemetryMetricsBatch({
    targets: apMetricsTargets,
    refreshInterval: 5000,
    shareToken: shareToken === "" ? undefined : shareToken,
  });

  const metricsLookup = useMemo(
    () => apMetricsLookupFromResults(apMetrics),
    [apMetrics]
  );

  const projectFlowState = useMemo(
    () =>
      apsToProjectFlowState(data, {
        namespaceFallback: ns,
        metricsLookup,
      }),
    [data, ns, metricsLookup]
  );

  const missingParams = shareToken === "" || ns === "" || uid === "";
  const blocked = missingParams || isLoading || error != null;
  const hasNodes = projectFlowState.initialNodes.length > 0;
  const showFlow = !blocked && hasNodes;

  if (missingParams) {
    return (
      <p className="text-muted-foreground text-sm">
        Missing preview link parameters. Use{" "}
        <code className="rounded bg-muted px-1">shareToken</code> and{" "}
        <code className="rounded bg-muted px-1">ns</code> query params.
      </p>
    );
  }

  if (showFlow) {
    return (
      <ProjectFlow.Root
        states={{
          initialEdges: projectFlowState.initialEdges,
          initialNodes: projectFlowState.initialNodes,
          readOnly: true,
        }}
      >
        <ProjectFlow.Variant0 className="min-h-0 flex-1" />
      </ProjectFlow.Root>
    );
  }

  return null;
}
