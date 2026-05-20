"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { API_ROUTES } from "../constants";
import { fetcher } from "../fetch";
import { apItemsFromList } from "../lib/ap-list";
import {
  type K8sGetResponse,
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "../schemas/k8s-get";
import { ApiUrl } from "../utils";
import type { K8sNamespacedListRefreshInterval } from "./use-k8s-namespaced-list";

function resolveRefreshInterval(
  refreshInterval: K8sNamespacedListRefreshInterval | undefined,
  latestData: K8sGetResponse | undefined
) {
  if (typeof refreshInterval === "function") {
    return refreshInterval(latestData);
  }
  return refreshInterval ?? 0;
}

export function useEntryPointList(options: {
  kubeconfig?: string;
  labelSelector?: string;
  namespace?: string;
  pollWhileEmpty?: boolean;
  refreshInterval?: K8sNamespacedListRefreshInterval;
  shareToken?: string;
}) {
  const {
    kubeconfig = "",
    labelSelector,
    namespace,
    pollWhileEmpty,
    refreshInterval,
    shareToken,
  } = options;

  const authHeader = useMemo((): Record<string, string> => {
    const st = shareToken?.trim() ?? "";
    if (st !== "") {
      return { "X-Share-Token": st };
    }
    return { Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` };
  }, [kubeconfig, shareToken]);
  const query = useMemo(
    () => ({
      ...(labelSelector ? { "label-selector": labelSelector } : {}),
      ...(namespace ? { namespace } : {}),
    }),
    [labelSelector, namespace]
  );
  const shareQuery = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        ...query,
        kind: "entrypoints",
      }),
    [query]
  );
  const hasShare = shareToken != null && shareToken.trim() !== "";
  const hasKubeconfig = kubeconfig.trim() !== "";
  const swrKey = (() => {
    if (hasShare) {
      if (namespace != null && namespace !== "") {
        return [API_ROUTES.k8s.get, "share", shareToken, shareQuery] as const;
      }
      return null;
    }
    if (hasKubeconfig) {
      return [API_ROUTES.entrypoint.root, query] as const;
    }
    return null;
  })();

  return useSWR(
    swrKey,
    () => {
      if (hasShare) {
        return fetcher<K8sGetResponse>({
          base: ApiUrl(),
          header: authHeader,
          method: "GET",
          path: API_ROUTES.k8s.get,
          query: {
            ...shareQuery,
            shareToken: shareToken?.trim(),
          },
          select: (raw) => k8sGetResponseSchema.parse(raw),
        });
      }

      return fetcher<K8sGetResponse>({
        base: ApiUrl(),
        header: authHeader,
        method: "GET",
        path: API_ROUTES.entrypoint.root,
        query,
        select: (raw) => k8sGetResponseSchema.parse(raw),
      });
    },
    {
      refreshInterval: (latestData) => {
        const configuredInterval = resolveRefreshInterval(
          refreshInterval,
          latestData
        );
        if (!pollWhileEmpty || apItemsFromList(latestData).length > 0) {
          return configuredInterval;
        }
        return configuredInterval > 0
          ? Math.min(configuredInterval, 1000)
          : 1000;
      },
    }
  );
}
