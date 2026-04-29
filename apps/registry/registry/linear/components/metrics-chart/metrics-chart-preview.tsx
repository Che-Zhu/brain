"use client";

import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";
import type { MetricsData } from "@workspace/ui/components/metrics-chart/metrics-chart.types";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";

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

function MetricsPreviewChartSurface({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      {/*
        Isolate chart box from padded flex parents so Recharts ResponsiveContainer gets a positive
        width/height on first layout (avoids width(-1)/height(-1) console warnings).
      */}
      <div className="h-56 min-h-56 w-full min-w-0">{children}</div>
    </div>
  );
}

export default function MetricsChartPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview
        className="min-h-[280px]"
        showMaximize
        title="MetricsChart — Variant1 (multi-series)"
      >
        <MetricsPreviewChartSurface>
          <MetricsChart.Variant1 data={SAMPLE_MULTI_SERIES} />
        </MetricsPreviewChartSurface>
      </Preview>
      <Preview
        className="min-h-[280px]"
        showMaximize
        title="MetricsChart — Variant0 (single series: cpu)"
      >
        <MetricsPreviewChartSurface>
          <MetricsChart.Variant0 data={SAMPLE_MULTI_SERIES} dataKey="cpu" />
        </MetricsPreviewChartSurface>
      </Preview>
      <Preview
        className="min-h-[280px]"
        showMaximize
        title="MetricsChart — Variant0 (dummy storage)"
      >
        <MetricsPreviewChartSurface>
          <MetricsChart.Variant0
            data={SAMPLE_STORAGE_DUMMY}
            dataKey="storage"
          />
        </MetricsPreviewChartSurface>
      </Preview>
    </PreviewWrapper>
  );
}
