"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { API_ROUTES } from "../constants";
import { fetcher } from "../fetch";
import { ApiUrl } from "../utils";

export interface ApTelemetryTarget {
  name: string;
  namespace: string;
}

export interface ApTelemetryMetricsRow extends ApTelemetryTarget {
  metrics: Record<string, number | string>[];
}

export function useApTelemetryMetricsBatch(options: {
  kubeconfig: string;
  targets: ApTelemetryTarget[];
  /** @default 5000 */
  refreshInterval?: number;
}) {
  const { kubeconfig, targets, refreshInterval = 5000 } = options;

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` }),
    [kubeconfig]
  );

  return useSWR(
    kubeconfig === "" || targets.length === 0
      ? null
      : ([API_ROUTES.telemetry.metrics, targets] as const),
    () =>
      Promise.all(
        targets.map((target) =>
          fetcher<Record<string, number | string>[]>({
            base: ApiUrl(),
            path: API_ROUTES.telemetry.metrics,
            query: {
              namespace: target.namespace,
              name: target.name,
              kind: "ap",
            },
            header: authHeader,
            method: "GET",
          }).then((metrics) => ({ ...target, metrics }))
        )
      ),
    { refreshInterval }
  );
}
