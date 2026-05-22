"use client";

import { useWorkloadTelemetrySeries } from "@workspace/api/hooks";
import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import type { MetricDataPoint } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import type { Node } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { Activity, Cpu, MemoryStick } from "lucide-react";
import { memo, useMemo } from "react";

import { containerStatesFromNode } from "@/lib/project-canvas/flow/container-node-workload";
import { computeMetricTrend } from "@/lib/project-canvas/telemetry/compute-metric-trend";
import { telemetryRowsToMetricsData } from "@/lib/project-canvas/telemetry/rows-to-metrics";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { CanvasResourcePane } from "./canvas-resource-pane";
import { formatPercent, latestPercent } from "./database-metrics-format";
import {
  METRICS_SERIES_STEP_SECONDS,
  workloadMetricsSeriesTarget,
  workloadMetricsSeriesWindow,
} from "./metrics-series-request";

function trendLabel(series: readonly MetricDataPoint[]) {
  const trend = computeMetricTrend(series);
  return trend.charAt(0).toUpperCase() + trend.slice(1);
}

function WorkloadMetricCard({
  fallback,
  icon: Icon,
  label,
  series,
}: {
  fallback: number | string | undefined;
  icon: typeof Cpu;
  label: string;
  series: MetricDataPoint[];
}) {
  const percent = latestPercent(series, fallback);

  return (
    <section className="flex h-54 min-h-54 min-w-0 flex-col gap-6 overflow-hidden rounded-lg bg-database-metrics-card p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Icon
              aria-hidden
              className="size-4 shrink-0 text-card-foreground"
            />
            <h3 className="truncate font-medium text-card-foreground text-sm leading-5">
              {label}
            </h3>
          </div>
          <p className="shrink-0 text-primary text-sm leading-5">
            {formatPercent(percent)}
          </p>
        </div>
        <p className="truncate text-muted-foreground text-sm leading-5">
          {trendLabel(series)}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        {series.length === 0 ? (
          <div className="flex h-full min-h-0 items-center justify-center border-database-metrics-grid border-y text-muted-foreground text-xs">
            No telemetry
          </div>
        ) : (
          <MetricsChart.Compact
            chartClassName="h-full min-h-0 w-full min-w-0 aspect-auto"
            data={series}
          />
        )}
      </div>
      <div className="flex shrink-0 justify-between text-muted-foreground text-sm leading-5">
        <span>Now</span>
        <span>-60m</span>
      </div>
    </section>
  );
}

export const WorkloadMetricsPane = memo(function WorkloadMetricsPane({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const ns = useAtomValue(namespaceAtom).trim();
  const states = containerStatesFromNode(node);
  const name = states?.name ?? "Workload";

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

  const metricsData = useMemo(
    () => telemetryRowsToMetricsData(telemetrySeries?.rows),
    [telemetrySeries]
  );

  return (
    <CanvasResourcePane
      bodyClassName="gap-3.5"
      closeAriaLabel="Close workload metrics"
      icon={
        <Activity
          aria-hidden
          className="size-4 shrink-0 text-database-metrics-chart"
        />
      }
      onClose={onClose}
      status={states?.status}
      subtitle={`${states?.kind ?? "Workload"} · Last 60 minutes`}
      title={`${name} Metrics`}
    >
      <WorkloadMetricCard
        fallback={states?.metrics?.cpu}
        icon={Cpu}
        label="CPU"
        series={metricsData.cpu ?? []}
      />
      <WorkloadMetricCard
        fallback={states?.metrics?.memory}
        icon={MemoryStick}
        label="Memory"
        series={metricsData.memory ?? []}
      />
    </CanvasResourcePane>
  );
});

WorkloadMetricsPane.displayName = "WorkloadMetricsPane";
