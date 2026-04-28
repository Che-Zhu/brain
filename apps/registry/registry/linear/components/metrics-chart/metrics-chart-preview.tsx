"use client";

import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
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

const SAMPLE_MULTI_SERIES: MetricsData = {
  cpu: buildSampleSeries(14, 48, 18),
  memory: buildSampleSeries(14, 38, 12),
};

/** Single-series dummy storage utilization (palette maps `storage` → chart‑4). */
const SAMPLE_STORAGE_DUMMY: MetricsData = {
  storage: buildSampleSeries(18, 44, 14),
};

export default function MetricsChartPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview
        className="min-h-[200px]"
        showMaximize
        title="MetricsChart — Variant1 (multi-series)"
      >
        <div className="flex min-h-[220px] w-full flex-col rounded-xl border border-border bg-background p-4">
          <MetricsChart.Variant1 data={SAMPLE_MULTI_SERIES} />
        </div>
      </Preview>
      <Preview
        className="min-h-[200px]"
        showMaximize
        title="MetricsChart — Variant0 (single series: cpu)"
      >
        <div className="flex min-h-[220px] w-full flex-col rounded-xl border border-border bg-background p-4">
          <MetricsChart.Variant0 data={SAMPLE_MULTI_SERIES} dataKey="cpu" />
        </div>
      </Preview>
      <Preview
        className="min-h-[200px]"
        showMaximize
        title="MetricsChart — Variant0 (dummy storage)"
      >
        <div className="flex min-h-[220px] w-full flex-col rounded-xl border border-border bg-background p-4">
          <MetricsChart.Variant0
            data={SAMPLE_STORAGE_DUMMY}
            dataKey="storage"
          />
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
