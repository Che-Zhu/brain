"use client";

import { useApTelemetryMetricsBatch } from "@workspace/api/hooks";
import type { CanvasPanelBodyProps } from "@workspace/ui/components/canvas/canvas.types";
import { MetricsPane } from "@workspace/ui/components/metrics-pane/metrics-pane";
import { useAtomValue } from "jotai";
import { memo, useMemo } from "react";

import {
  containerStatesFromNode,
  telemetryKindFromWorkload,
  workloadClaimKindFromStates,
} from "@/lib/project-canvas/flow/container-node-workload";
import { telemetryRowsToMetricsData } from "@/lib/project-canvas/telemetry/rows-to-metrics";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

export const WorkloadMetricsCanvasPanel = memo(
  function WorkloadMetricsCanvasPanel({ node }: CanvasPanelBodyProps) {
    const kubeconfig = useAtomValue(kubeconfigAtom);
    const ns = useAtomValue(namespaceAtom).trim();
    const nsForTargets = ns === "" ? undefined : ns;

    const states = containerStatesFromNode(node);
    const name = states?.name;
    const workloadKind = workloadClaimKindFromStates(states);
    const kind = telemetryKindFromWorkload(workloadKind);

    const targets = useMemo(() => {
      if (nsForTargets === undefined || name === undefined || name === "") {
        return [];
      }
      return [{ kind, name, namespace: nsForTargets }];
    }, [kind, name, nsForTargets]);

    const { data: telemetryBatch } = useApTelemetryMetricsBatch({
      kubeconfig,
      refreshInterval: 5000,
      targets,
    });

    const metricsData = useMemo(() => {
      const row = telemetryBatch?.[0];
      return telemetryRowsToMetricsData(row?.metrics);
    }, [telemetryBatch]);

    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <MetricsPane data={metricsData} />
      </div>
    );
  }
);

WorkloadMetricsCanvasPanel.displayName = "WorkloadMetricsCanvasPanel";
