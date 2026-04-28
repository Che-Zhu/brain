"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { MetricsChartContext } from "./metrics-chart.context";
import { METRICS_CHART_SURFACE_CLASS_DEFAULT } from "./metrics-chart.defaults";
import type { MetricsChartContextValue } from "./metrics-chart.types";

export function MetricsChartProvider({
  children,
  chartClassName,
  data,
  dataKey,
}: {
  children: ReactNode;
  chartClassName?: string;
  data: MetricsChartContextValue["data"];
  dataKey?: string;
}) {
  const value = useMemo<MetricsChartContextValue>(
    () => ({
      chartClassName: chartClassName ?? METRICS_CHART_SURFACE_CLASS_DEFAULT,
      data,
      dataKey,
    }),
    [chartClassName, data, dataKey]
  );

  return <MetricsChartContext value={value}>{children}</MetricsChartContext>;
}
