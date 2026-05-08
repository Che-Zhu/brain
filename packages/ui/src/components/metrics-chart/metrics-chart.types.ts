import type { ReactNode } from "react";

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export type MetricsData = Record<string, MetricDataPoint[]>;

export interface MetricsChartContextValue {
  chartClassName: string;
  data: MetricsData;
  dataKey?: string;
}

export interface MetricsChartRootProps {
  chartClassName?: string;
  children: ReactNode;
  data: MetricsData;
  dataKey?: string;
}
