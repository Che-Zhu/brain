"use client";

import { useWorkloadTelemetrySeries } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import type {
  DatabaseNodeMetricKey,
  DatabaseNodeMetricValue,
} from "@workspace/ui/components/database-node/database-node";
import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import type { MetricDataPoint } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { cn } from "@workspace/ui/lib/utils";
import type { Node } from "@xyflow/react";
import { Activity, Cpu, HardDrive, MemoryStick, X } from "lucide-react";
import { type ComponentType, type SVGProps, useMemo } from "react";
import { CANVAS_DATABASE_NODE_TYPE } from "@/lib/project-canvas/nodes/constants";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { computeMetricTrend } from "@/lib/project-canvas/telemetry/compute-metric-trend";
import { telemetryRowsToMetricsData } from "@/lib/project-canvas/telemetry/rows-to-metrics";
import {
  formatPercent,
  latestPercent,
  metricReading,
} from "./database-metrics-format";
import {
  databaseMetricsSeriesTarget,
  METRICS_SERIES_STEP_SECONDS,
  workloadMetricsSeriesWindow,
} from "./metrics-series-request";

const METRICS_REFRESH_MS = 5000;

interface DatabaseMetricsPaneProps {
  kubeconfig?: string;
  node: Node | null;
  onClose: () => void;
  open: boolean;
}

function databaseDataFromNode(
  node: Node | null
): CanvasDatabaseNodeData | null {
  if (node?.type !== CANVAS_DATABASE_NODE_TYPE) {
    return null;
  }
  return node.data as CanvasDatabaseNodeData;
}

function trendLabel(series: readonly MetricDataPoint[]) {
  const trend = computeMetricTrend(series);
  return trend.charAt(0).toUpperCase() + trend.slice(1);
}

function statusPillClassName(status: string | undefined) {
  switch (status?.trim().toLowerCase()) {
    case "running":
      return "bg-database-metrics-status-running text-primary";
    case "failed":
      return "bg-destructive/25 text-destructive";
    case "paused":
    case "stopped":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}

function DatabaseMetricCard({
  capacity,
  className,
  fallback,
  icon: Icon,
  label,
  metric,
  series,
}: {
  capacity: string | undefined;
  className?: string;
  fallback: DatabaseNodeMetricValue | undefined;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  metric: DatabaseNodeMetricKey;
  series: MetricDataPoint[];
}) {
  const percent = latestPercent(series, fallback);

  return (
    <section
      className={cn(
        "flex h-54 min-h-54 min-w-0 flex-col gap-6 overflow-hidden rounded-lg bg-database-metrics-card p-4 shadow-sm",
        className
      )}
    >
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
            {metricReading({ capacity, kind: metric, percent })}
          </p>
        </div>
        <div className="flex min-w-0 justify-between gap-3 text-sm leading-5">
          <p className="truncate text-muted-foreground">{trendLabel(series)}</p>
          <p className="shrink-0 text-primary">{formatPercent(percent)}</p>
        </div>
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

function StorageGauge({ percent }: { percent: number | undefined }) {
  return (
    <div className="h-8 w-full overflow-hidden bg-database-metrics-storage-track">
      <div
        className="h-full rounded-r-lg bg-gradient-to-r from-blue-500/40 to-blue-400/40 transition-[width]"
        style={{ width: `${percent ?? 0}%` }}
      />
    </div>
  );
}

function DatabaseStorageCard({
  capacity,
  fallback,
  mountPath,
  series,
}: {
  capacity: string | undefined;
  fallback: DatabaseNodeMetricValue | undefined;
  mountPath: string | undefined;
  series: MetricDataPoint[];
}) {
  const percent = latestPercent(series, fallback);

  return (
    <section className="flex min-w-0 flex-col gap-6 rounded-lg bg-database-metrics-card p-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <HardDrive
              aria-hidden
              className="size-4 shrink-0 text-card-foreground"
            />
            <h3 className="truncate font-medium text-card-foreground text-sm leading-5">
              Storage
            </h3>
          </div>
          <p className="shrink-0 text-primary text-sm leading-5">
            {metricReading({ capacity, kind: "storage", percent })}
          </p>
        </div>
        <div className="flex min-w-0 justify-between gap-3 text-sm leading-5">
          <p className="truncate text-muted-foreground">
            Mounted directory: {mountPath ?? "--"}
          </p>
          <p className="shrink-0 text-primary">{formatPercent(percent)}</p>
        </div>
      </div>
      <StorageGauge percent={percent} />
    </section>
  );
}

export function DatabaseMetricsPane({
  kubeconfig,
  node,
  onClose,
  open,
}: DatabaseMetricsPaneProps) {
  const databaseData = open ? databaseDataFromNode(node) : null;
  const telemetryTarget = useMemo(
    () => databaseMetricsSeriesTarget(node, open),
    [node, open]
  );

  const { data: telemetrySeries } = useWorkloadTelemetrySeries({
    getWindow: workloadMetricsSeriesWindow,
    kubeconfig,
    refreshInterval: METRICS_REFRESH_MS,
    target: telemetryTarget,
    windowKey: `last-60m-${METRICS_SERIES_STEP_SECONDS}s`,
  });

  const metricsData = useMemo(
    () => telemetryRowsToMetricsData(telemetrySeries?.rows),
    [telemetrySeries]
  );

  if (databaseData === null) {
    return null;
  }

  const { states } = databaseData;
  const cpuSeries = metricsData.cpu ?? [];
  const memorySeries = metricsData.memory ?? [];
  const storageSeries = metricsData.storage ?? [];
  const title = `${states.name} Metrics`;
  const subtitle = `${states.displayEngine}${states.formattedVersion ? ` ${states.formattedVersion}` : ""} · Last 60 minutes`;
  const statusLabel = states.status?.label ?? "Unknown";

  return (
    <aside className="database-metrics-pane-surface pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-full min-w-0 max-w-xl flex-col gap-6 overflow-hidden px-2.5 py-5 shadow-lg">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-2.5">
        <header className="flex shrink-0 items-start justify-between gap-3 px-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  aria-hidden
                  className="size-4 shrink-0 text-database-metrics-chart"
                />
                <h2
                  className="truncate font-semibold text-lg text-primary leading-none"
                  title={title}
                >
                  {title}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center rounded-full px-2.5 text-xs leading-none",
                  statusPillClassName(statusLabel)
                )}
              >
                {statusLabel}
              </span>
            </div>
            <p className="truncate text-muted-foreground text-sm leading-5">
              {subtitle}
            </p>
          </div>
          <Button
            aria-label="Close database metrics"
            className="hoverable -mt-1 size-7 shrink-0"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
          </Button>
        </header>
        <DatabaseMetricCard
          capacity={states.metricCapacities?.cpu}
          fallback={states.metrics?.cpu}
          icon={Cpu}
          label="CPU"
          metric="cpu"
          series={cpuSeries}
        />
        <DatabaseMetricCard
          capacity={states.metricCapacities?.memory}
          fallback={states.metrics?.memory}
          icon={MemoryStick}
          label="Memory"
          metric="memory"
          series={memorySeries}
        />
        <DatabaseStorageCard
          capacity={states.metricCapacities?.storage}
          fallback={states.metrics?.storage}
          mountPath={states.mountPath}
          series={storageSeries}
        />
      </div>
    </aside>
  );
}
