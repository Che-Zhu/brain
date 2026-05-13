// lib/catalog.ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const metricDataPointSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
});

const githubDeployerRepoSchema = z.object({
  fullName: z.string().optional(),
  id: z.string(),
  name: z.string(),
});

export const catalog = defineCatalog(schema, {
  components: {
    GithubDeployer: {
      props: z.object({
        githubToken: z.string().nullable().optional(),
        isLoading: z.boolean().optional(),
        repos: z.array(githubDeployerRepoSchema).optional(),
        deployedRepo: githubDeployerRepoSchema.nullable().optional(),
      }),
      description:
        "GitHub deployer: `githubToken` falsy → auth; token + `repos` → picker; **`deployedRepo` alone is enough** for the completed summary card — omit other props when showing deploy result",
    },
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
