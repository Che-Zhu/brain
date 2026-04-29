"use client";

import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
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

/** Static spec for the json-render catalog (MetricsChart only). */
const AGUI_DUMMY_SPEC: Spec = {
  root: "el-root",
  elements: {
    "el-root": {
      type: "MetricsChart",
      props: {
        data: SAMPLE_MULTI_SERIES,
        dataKey: "cpu",
      },
      children: [],
    },
  },
};

export default function AGUIPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        className="min-h-[280px]"
        showMaximize
        title="AGUI — MetricsChart from json-render spec (dummy data)"
      >
        <div className="rounded-xl border border-border bg-background p-4">
          <JSONUIProvider registry={registry}>
            <Renderer registry={registry} spec={AGUI_DUMMY_SPEC} />
          </JSONUIProvider>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
