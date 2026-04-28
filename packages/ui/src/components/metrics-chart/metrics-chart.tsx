"use client";

import { MetricsChartArea } from "./metrics-chart.area";
import { MetricsChartProvider } from "./metrics-chart.provider";
import type { MetricsChartRootProps } from "./metrics-chart.types";

export function MetricsChartRoot({
  chartClassName,
  children,
  data,
  dataKey,
}: MetricsChartRootProps) {
  return (
    <MetricsChartProvider
      chartClassName={chartClassName}
      data={data}
      dataKey={dataKey}
    >
      {children}
    </MetricsChartProvider>
  );
}

export function MetricsChartVariant0({
  chartClassName,
  data,
  dataKey,
}: Omit<MetricsChartRootProps, "children"> & {
  dataKey: string;
}) {
  return (
    <MetricsChartRoot
      chartClassName={chartClassName}
      data={data}
      dataKey={dataKey}
    >
      <MetricsChartArea />
    </MetricsChartRoot>
  );
}

export function MetricsChartVariant1({
  chartClassName,
  data,
}: Omit<MetricsChartRootProps, "children">) {
  return (
    <MetricsChartRoot chartClassName={chartClassName} data={data}>
      <MetricsChartArea />
    </MetricsChartRoot>
  );
}

export const MetricsChart = {
  Area: MetricsChartArea,
  Root: MetricsChartRoot,
  Variant0: MetricsChartVariant0,
  Variant1: MetricsChartVariant1,
};

export type {
  MetricDataPoint,
  MetricsChartContextValue,
  MetricsChartRootProps,
  MetricsData,
} from "./metrics-chart.types";

// biome-ignore lint/performance/noBarrelFile: re-export for `import { useMetricsChart } from …/metrics-chart`
export { useMetricsChart } from "./metrics-chart.use";
