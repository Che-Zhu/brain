"use client";

import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { MetricsPane } from "@workspace/ui/components/metrics-pane/metrics-pane";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";

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

const FOUR_METRICS: MetricsData = {
  cpu: buildSampleSeries(14, 48, 18),
  memory: buildSampleSeries(14, 38, 12),
  storage: buildSampleSeries(12, 44, 10),
  network: buildSampleSeries(16, 22, 20),
};

const SINGLE_METRIC: MetricsData = {
  cpu: buildSampleSeries(20, 50, 15),
};

const TWO_METRICS: MetricsData = {
  cpu: buildSampleSeries(10, 40, 12),
  memory: buildSampleSeries(10, 35, 8),
};

export default function MetricsPanePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        showMaximize
        title="MetricsPane — four keys (responsive auto-fill rows)"
      >
        <MetricsPane data={FOUR_METRICS} />
      </Preview>
      <Preview showMaximize title="MetricsPane — two keys">
        <MetricsPane data={TWO_METRICS} />
      </Preview>
      <Preview showMaximize title="MetricsPane — single key">
        <MetricsPane data={SINGLE_METRIC} />
      </Preview>
      <Preview showMaximize title="MetricsPane — empty series hidden">
        <MetricsPane
          data={{
            cpu: buildSampleSeries(8, 30, 6),
            memory: [],
            storage: [],
          }}
        />
      </Preview>
    </PreviewWrapper>
  );
}
