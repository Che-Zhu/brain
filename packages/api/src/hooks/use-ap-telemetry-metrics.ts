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
  /** User kubeconfig. Omit when using `shareToken`. */
  kubeconfig?: string;
  targets: ApTelemetryTarget[];
  /** @default 5000 */
  refreshInterval?: number;
  /** When set, metrics requests use share token auth (kind=ap only on server). */
  shareToken?: string;
}) {
  const { targets, refreshInterval = 5000, shareToken } = options;
  const kubeconfig = options.kubeconfig ?? "";

  const authHeader = useMemo((): Record<string, string> => {
    const st = shareToken?.trim() ?? "";
    if (st !== "") {
      return { "X-Share-Token": st };
    }
    return { Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` };
  }, [kubeconfig, shareToken]);

  const st = shareToken?.trim() ?? "";
  const useShare = st !== "";
  const hasKubeconfig = kubeconfig.trim() !== "";

  return useSWR(
    (useShare || hasKubeconfig) && targets.length > 0
      ? ([
          API_ROUTES.telemetry.metrics,
          useShare ? "share" : "kc",
          st,
          targets,
        ] as const)
      : null,
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
              ...(useShare ? { shareToken: st } : {}),
            },
            header: authHeader,
            method: "GET",
          }).then((metrics) => ({ ...target, metrics }))
        )
      ),
    { refreshInterval }
  );
}
