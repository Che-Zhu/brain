"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { API_ROUTES } from "../constants";
import { fetcher } from "../fetch";
import {
  type K8sGetResponse,
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "../schemas/k8s-get";
import { ApiUrl } from "../utils";

export function useApsK8sList(options: {
  /** User kubeconfig (URL-encoded in Authorization). Omit when using `shareToken`. */
  kubeconfig?: string;
  labelSelector: string;
  namespace?: string;
  /** When set, calls k8s get with share token + admin kubeconfig on the server (no user kubeconfig). */
  shareToken?: string;
}) {
  const { labelSelector, namespace, shareToken } = options;
  const kubeconfig = options.kubeconfig ?? "";

  const authHeader = useMemo((): Record<string, string> => {
    const st = shareToken?.trim() ?? "";
    if (st !== "") {
      return { "X-Share-Token": st };
    }
    return { Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` };
  }, [kubeconfig, shareToken]);

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "aps",
        "label-selector": labelSelector,
        ...(namespace ? { namespace } : {}),
      }),
    [labelSelector, namespace]
  );

  const hasShare = shareToken != null && shareToken.trim() !== "";
  const hasKubeconfig = kubeconfig.trim() !== "";

  const swrKey = hasShare
    ? namespace != null && namespace !== ""
      ? ([API_ROUTES.k8s.get, "share", shareToken, getParams] as const)
      : null
    : hasKubeconfig
      ? ([API_ROUTES.k8s.get, getParams] as const)
      : null;

  return useSWR(swrKey, () =>
    fetcher<K8sGetResponse>({
      base: ApiUrl(),
      path: API_ROUTES.k8s.get,
      query: {
        ...getParams,
        ...(shareToken != null && shareToken.trim() !== ""
          ? { shareToken: shareToken.trim() }
          : {}),
      },
      header: authHeader,
      method: "GET",
      select: (raw) => k8sGetResponseSchema.parse(raw),
    })
  );
}
