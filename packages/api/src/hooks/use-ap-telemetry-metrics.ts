"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { API_ROUTES } from "../constants";
import { fetcher } from "../fetch";
import { ApiUrl } from "../utils";

/** `GET .../metrics?kind=` — share-token auth allows `ap` only (server-enforced). */
export type ApTelemetryResourceKind = "ap" | "db";

export interface ApTelemetryTarget {
  kind: ApTelemetryResourceKind;
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
  /** When set without kubeconfig, metrics use share token auth (`kind=ap` targets only). */
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

  const fetchTargets = useMemo(() => {
    if (useShare) {
      return targets.filter((t) => t.kind === "ap");
    }
    return targets;
  }, [useShare, targets]);

  return useSWR(
    (useShare || hasKubeconfig) && fetchTargets.length > 0
      ? ([
          API_ROUTES.telemetry.metrics,
          useShare ? "share" : "kc",
          st,
          fetchTargets,
        ] as const)
      : null,
    () =>
      Promise.all(
        fetchTargets.map((target) =>
          fetcher<Record<string, number | string>[]>({
            base: ApiUrl(),
            path: API_ROUTES.telemetry.metrics,
            query: {
              name: target.name,
              ...(useShare ? { shareToken: st } : {}),
              kind: target.kind,
              namespace: target.namespace,
            },
            header: authHeader,
            method: "GET",
          }).then((metrics) => ({ ...target, metrics }))
        )
      ),
    { refreshInterval }
  );
}
