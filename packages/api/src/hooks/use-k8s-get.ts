"use client";

import type { SWRConfiguration } from "swr";
import useSWR from "swr";
import { k8sGet } from "../api.actions";

/** Same shape as the second argument to {@link k8sGet}. */
export type K8sGetParams = Parameters<typeof k8sGet>[1];

/**
 * SWR wrapper around {@link k8sGet}. No request when `kubeconfig` is nullish.
 * Memoize `params` (e.g. `useMemo`) if its identity changes every render to avoid duplicate fetches.
 */
export function useK8SGet(
  kubeconfig: string | null | undefined,
  params: K8sGetParams,
  swrOptions?: SWRConfiguration
) {
  const paramsKey = JSON.stringify(params);

  return useSWR(
    kubeconfig ? (["k8s-get", kubeconfig, paramsKey] as const) : null,
    ([, kc, key]) => k8sGet(kc, JSON.parse(key) as K8sGetParams),
    swrOptions
  );
}
