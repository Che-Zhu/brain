"use client";

import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { cn } from "@workspace/ui/lib/utils";

export interface MetricsPaneProps {
  className?: string;
  /** One timestamped series per key; each non-empty series gets its own chart. */
  data: MetricsData;
}

function metricKeyDisplayLabel(key: string): string {
  const spaced = key.replace(/[-_]/g, " ");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Responsive grid: one single-series chart per metric key that has data points. */
export function MetricsPane({ data, className }: MetricsPaneProps) {
  const entries = Object.entries(data).filter(
    ([, points]) => Array.isArray(points) && points.length > 0
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No metric series to display.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid w-full gap-4",
        "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]",
        className
      )}
    >
      {entries.map(([metricKey, points]) => (
        <div
          className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-4"
          key={metricKey}
        >
          <h3 className="font-medium text-foreground text-sm">
            {metricKeyDisplayLabel(metricKey)}
          </h3>
          {/*
            Fixed chart box so ResponsiveContainer receives a definite height on first paint.
           */}
          <div className="h-56 min-h-56 w-full min-w-0 shrink-0">
            <MetricsChart.Variant0
              data={{ [metricKey]: points }}
              dataKey={metricKey}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
