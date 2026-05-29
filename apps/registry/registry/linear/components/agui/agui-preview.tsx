"use client";

import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { githubDeployerDeployedAguiSpec } from "@workspace/ui/lib/agui/github-deployer-spec";
import { registry } from "@workspace/ui/lib/registry";

const SAMPLE_BASE_SECONDS = Math.floor(Date.now() / 1000) - 3600;

function buildSampleSeries(
  count: number,
  offset: number,
  amplitude: number
): MetricsData[string] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: SAMPLE_BASE_SECONDS + i * 300,
    value: Math.min(
      100,
      Math.max(0, offset + amplitude * Math.sin(i * 0.45) + i * 0.8)
    ),
  }));
}

const SAMPLE_MULTI_SERIES: MetricsData = {
  cpu: buildSampleSeries(14, 48, 18),
  memory: buildSampleSeries(14, 38, 12),
};

const SAMPLE_AGUI_REPOS = [
  { fullName: "acme/sealai-ui", id: "repo-ui", name: "sealai-ui" },
  { fullName: "acme/platform-api", id: "repo-api", name: "platform-api" },
  { fullName: "acme/observability", id: "repo-obs", name: "observability" },
] as const;

/** Metrics json-render spec. */
const AGUI_METRICS_SPEC: Spec = {
  root: "MetricsChart",
  elements: {
    MetricsChart: {
      type: "MetricsChart",
      props: {
        data: SAMPLE_MULTI_SERIES,
        dataKey: "cpu",
      },
    },
  },
};

/** Selecting stage: token + repos (no `actions` in AGUI — deploy disabled). */
const AGUI_GITHUB_DEPLOYER_SPEC: Spec = {
  root: "GithubDeployer",
  elements: {
    GithubDeployer: {
      type: "GithubDeployer",
      props: {
        isAuthorized: true,
        isLoading: false,
        repos: [...SAMPLE_AGUI_REPOS],
      },
      children: [],
    },
  },
};

/** Completed deployer: **`deployedRepo` only** (validates via catalog). */
const AGUI_GITHUB_DEPLOYED_SPEC: Spec = githubDeployerDeployedAguiSpec(
  SAMPLE_AGUI_REPOS[0]
);

export default function AGUIPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        className="min-h-[280px]"
        showMaximize
        title="AGUI — MetricsChart from json-render spec"
      >
        <div className="bg-background p-4">
          <JSONUIProvider registry={registry}>
            <Renderer registry={registry} spec={AGUI_METRICS_SPEC} />
          </JSONUIProvider>
        </div>
      </Preview>
      <Preview
        className="flex min-h-[320px] items-center justify-center"
        showMaximize
        title="AGUI — GithubDeployer (selecting)"
      >
        <div className="max-w-md rounded-xl border border-border bg-background p-4">
          <JSONUIProvider registry={registry}>
            <Renderer registry={registry} spec={AGUI_GITHUB_DEPLOYER_SPEC} />
          </JSONUIProvider>
        </div>
      </Preview>
      <Preview
        className="flex min-h-[320px] items-center justify-center"
        showMaximize
        title="AGUI — GithubDeployer (complete, `deployedRepo` only)"
      >
        <div className="max-w-md rounded-xl border border-border bg-background p-4">
          <JSONUIProvider registry={registry}>
            <Renderer registry={registry} spec={AGUI_GITHUB_DEPLOYED_SPEC} />
          </JSONUIProvider>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
