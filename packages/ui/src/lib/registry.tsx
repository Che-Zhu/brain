// lib/registry.tsx
import { defineRegistry, type ComponentContext } from "@json-render/react";

import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    MetricsChart: ({
      props,
    }: ComponentContext<typeof catalog, "MetricsChart">) => (
      <div className="h-56 min-h-56 w-full min-w-0">
        <MetricsChart.Variant0
          chartClassName={props.chartClassName ?? undefined}
          data={props.data}
          dataKey={props.dataKey}
        />
      </div>
    ),
  },
});
