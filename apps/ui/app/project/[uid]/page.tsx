"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
} from "@workspace/api/hooks";
import { apNamespaceNameTargetsFromList } from "@workspace/api/lib/ap-list";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { ProjectFlow } from "@workspace/ui/components/project-flow/project-flow";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { encodedKubeconfigAtom, namespaceAtom } from "@/atom/auth-atom";
import {
  apMetricsLookupFromResults,
  apsToProjectFlowState,
} from "@/lib/ap-to-project-flow";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(encodedKubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const { data, error, isLoading } = useApsK8sList({
    kubeconfig,
    labelSelector,
    namespace,
  });

  const apMetricsTargets = useMemo(
    () => apNamespaceNameTargetsFromList(data, namespace),
    [data, namespace]
  );

  const { data: apMetrics } = useApTelemetryMetricsBatch({
    kubeconfig,
    targets: apMetricsTargets,
    refreshInterval: 5000,
  });

  const metricsLookup = useMemo(
    () => apMetricsLookupFromResults(apMetrics),
    [apMetrics]
  );

  const projectFlowState = useMemo(
    () =>
      apsToProjectFlowState(data, {
        namespaceFallback: namespace,
        metricsLookup,
      }),
    [data, namespace, metricsLookup]
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {kubeconfig !== "" &&
        !isLoading &&
        error == null &&
        projectFlowState.initialNodes.length > 0 && (
          <ProjectFlow.Root
            states={{
              initialEdges: projectFlowState.initialEdges,
              initialNodes: projectFlowState.initialNodes,
            }}
          >
            <ProjectFlow.Variant0 className="min-h-0 flex-1" />
          </ProjectFlow.Root>
        )}
    </div>
  );
}
