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

/** Plural k8s resource short name as accepted by `GET /api/k8s/.../get` (e.g. `aps`, `dbs`). */
export function useK8sNamespacedList(options: {
  kind: string;
  kubeconfig?: string;
  labelSelector: string;
  namespace?: string;
  shareToken?: string;
  pollWhileEmpty?: boolean;
  /**
   * With `pollWhileEmpty`, used to coordinate two lists: fast poll only if this list is empty **and**
   * `peerEmpty()` is true (e.g. 1s interval only while both AP and DB lists are still empty).
   */
  peerEmpty?: () => boolean;
}) {
  const { kind, labelSelector, namespace, shareToken } = options;
  const pollWhileEmpty = options.pollWhileEmpty === true;
  const peerEmpty = options.peerEmpty;
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
        kind,
        "label-selector": labelSelector,
        ...(namespace ? { namespace } : {}),
      }),
    [kind, labelSelector, namespace]
  );

  const hasShare = shareToken != null && shareToken.trim() !== "";
  const hasKubeconfig = kubeconfig.trim() !== "";

  const swrKey = (() => {
    if (hasShare) {
      if (namespace != null && namespace !== "") {
        return [API_ROUTES.k8s.get, "share", shareToken, getParams] as const;
      }
      return null;
    }
    if (hasKubeconfig) {
      return [API_ROUTES.k8s.get, getParams] as const;
    }
    return null;
  })();

  return useSWR(
    swrKey,
    () =>
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
      }),
    {
      refreshInterval: (latestData) => {
        if (!pollWhileEmpty) {
          return 0;
        }
        if (apItemsFromList(latestData).length > 0) {
          return 0;
        }
        if (peerEmpty != null) {
          return peerEmpty() ? 1000 : 0;
        }
        return 1000;
      },
    }
  );
}
