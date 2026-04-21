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
  kubeconfig: string;
  labelSelector: string;
  namespace?: string;
}) {
  const { kubeconfig, labelSelector, namespace } = options;

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` }),
    [kubeconfig]
  );

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "aps",
        "label-selector": labelSelector,
        ...(namespace ? { namespace } : {}),
      }),
    [labelSelector, namespace]
  );

  return useSWR(
    kubeconfig === "" ? null : ([API_ROUTES.k8s.get, getParams] as const),
    () =>
      fetcher<K8sGetResponse>({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query: { ...getParams },
        header: authHeader,
        method: "GET",
        select: (raw) => k8sGetResponseSchema.parse(raw),
      })
  );
}
