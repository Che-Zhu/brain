/** Default ChartContainer (`className`) — override `@workspace/ui` chart `aspect-video`; give Recharts a definite box (`min-w-0` avoids grid/flex `-1` measure glitches). */
export const METRICS_CHART_SURFACE_CLASS_DEFAULT =
  "aspect-auto flex h-56 min-h-56 w-full min-w-0 shrink-0 flex-col [&_.recharts-responsive-container]:min-h-[12rem] [&_.recharts-responsive-container]:min-w-0 [&_.recharts-responsive-container]:w-full";
