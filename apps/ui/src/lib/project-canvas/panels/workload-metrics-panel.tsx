"use client";

import { useWorkloadTelemetrySeries } from "@workspace/api/hooks";
import type { CanvasPanelBodyProps } from "@workspace/ui/components/canvas/canvas.types";
import { MetricsPane } from "@workspace/ui/components/metrics-pane/metrics-pane";
import { useAtomValue } from "jotai";
import { memo, useMemo } from "react";

import { telemetryRowsToMetricsData } from "@/lib/project-canvas/telemetry/rows-to-metrics";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import {
  METRICS_SERIES_STEP_SECONDS,
  workloadMetricsSeriesTarget,
  workloadMetricsSeriesWindow,
} from "./metrics-series-request";

export const WorkloadMetricsCanvasPanel = memo(
  function WorkloadMetricsCanvasPanel({ node }: CanvasPanelBodyProps) {
    const kubeconfig = useAtomValue(kubeconfigAtom);
    const ns = useAtomValue(namespaceAtom).trim();

    const target = useMemo(
      () => workloadMetricsSeriesTarget(node, ns),
      [node, ns]
    );

    const { data: telemetrySeries } = useWorkloadTelemetrySeries({
      getWindow: workloadMetricsSeriesWindow,
      kubeconfig,
      refreshInterval: 5000,
      target,
      windowKey: `last-60m-${METRICS_SERIES_STEP_SECONDS}s`,
    });

    const metricsData = useMemo(() => {
      return telemetryRowsToMetricsData(telemetrySeries?.rows);
    }, [telemetrySeries]);

    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <MetricsPane data={metricsData} />
      </div>
    );
  }
);

WorkloadMetricsCanvasPanel.displayName = "WorkloadMetricsCanvasPanel";
