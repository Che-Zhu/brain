"use client";

import { use } from "react";

import { MetricsChartContext } from "./metrics-chart.context";

export function useMetricsChart() {
  const ctx = use(MetricsChartContext);
  if (!ctx) {
    throw new Error(
      "useMetricsChart must be used within MetricsChart.Root (or MetricsChartProvider)."
    );
  }
  return ctx;
}
