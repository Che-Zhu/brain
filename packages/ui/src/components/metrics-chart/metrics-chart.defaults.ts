/** Default ChartContainer (`className`) — must override `@workspace/ui` chart `aspect-video` so Recharts `<ResponsiveContainer />` receives a definite height (avoids collapsed / invisible plots). */
export const METRICS_CHART_SURFACE_CLASS_DEFAULT =
  "aspect-auto flex h-56 min-h-56 w-full flex-col [&_.recharts-responsive-container]:min-h-[12rem]";
