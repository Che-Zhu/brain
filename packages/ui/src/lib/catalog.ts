// lib/catalog.ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const metricDataPointSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
});

export const catalog = defineCatalog(schema, {
  components: {
    MetricsChart: {
      props: z.object({
        chartClassName: z.string().nullable().optional(),
        data: z.record(z.string(), z.array(metricDataPointSchema)),
        dataKey: z.string(),
      }),
      description:
        "Multi-series metrics area chart (MetricsChart.Variant0: one focused series)",
    },
  },
  actions: {},
});
