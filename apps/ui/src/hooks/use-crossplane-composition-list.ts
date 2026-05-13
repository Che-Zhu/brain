"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  type K8sGetResponse,
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { useMemo } from "react";
import useSWR from "swr";
import {
  applyCompositionExtraFilter,
  type CompositionListFilter,
  type CompositionListItem,
  type CrossplaneCompositionRaw,
  compositionsRawToListItems,
  extractK8sListItems,
  filterCompositionsForXrKind,
  getCompositionFilterStableKey,
} from "@/lib/crossplane-composition-list";

export interface UseCrossplaneCompositionListOptions {
  /** Case-insensitive match on `spec.compositeTypeRef.kind` (e.g. `DB`, `AP`, `Project`). */
  compositeKind: string;
  filter?: CompositionListFilter;
  kubeconfig?: string;
  /** Distinct cache segment (`db-compositions`, `ap-compositions`, …). */
  swrKeySegment: string;
  /** When true, exposes `items` as {@link CompositionListItem}[]. */
  toItems?: boolean;
}

/**
 * Lists Crossplane `Composition` CRs filtered by XR kind; uses {@link API_ROUTES.k8s.get} `kind=compositions`.
 */
export function useCrossplaneCompositionList(
  options?: UseCrossplaneCompositionListOptions
): ReturnType<typeof useSWR<K8sGetResponse>> & {
  compositions: CrossplaneCompositionRaw[];
  items?: CompositionListItem[];
} {
  const kubeconfig = options?.kubeconfig?.trim() ?? "";
  const extraFilter = options?.filter;
  const toItems = options?.toItems ?? false;
  const compositeKind = options?.compositeKind?.trim() ?? "";
  const swrKeySegment = options?.swrKeySegment?.trim() ?? "compositions";

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "compositions",
      }),
    []
  );

  const hasKubeconfig = kubeconfig !== "";

  const swr = useSWR(
    hasKubeconfig && compositeKind !== ""
      ? ([
          API_ROUTES.k8s.get,
          swrKeySegment,
          compositeKind,
          getParams,
          getCompositionFilterStableKey(extraFilter),
        ] as const)
      : null,
    async () =>
      fetcher<K8sGetResponse>({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query: { ...getParams },
        header: {
          Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
        },
        method: "GET",
        select: (raw) => k8sGetResponseSchema.parse(raw),
      })
  );

  const compositions = useMemo(() => {
    const parsed = swr.data;
    if (!parsed) {
      return [];
    }
    const rawItems = extractK8sListItems(parsed) as CrossplaneCompositionRaw[];
    const forKind = filterCompositionsForXrKind(rawItems, compositeKind);
    return applyCompositionExtraFilter(forKind, extraFilter);
  }, [compositeKind, extraFilter, swr.data]);

  const items = useMemo(() => {
    if (!toItems) {
      return undefined;
    }
    return compositionsRawToListItems(compositions);
  }, [compositions, toItems]);

  return { ...swr, compositions, items };
}
