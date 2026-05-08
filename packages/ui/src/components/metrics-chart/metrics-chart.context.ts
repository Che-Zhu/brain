import { createContext } from "react";

import type { MetricsChartContextValue } from "./metrics-chart.types";

export const MetricsChartContext =
  createContext<MetricsChartContextValue | null>(null);
