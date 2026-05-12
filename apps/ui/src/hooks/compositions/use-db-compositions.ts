"use client";

/**
 * Lists Crossplane Compositions targeting the **DB** XR.
 */

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type useSWR from "swr";
import { useCrossplaneCompositionList } from "@/hooks/use-crossplane-composition-list";
import type {
  CompositionListFilter,
  CompositionListItem,
  CrossplaneCompositionRaw,
} from "@/lib/crossplane-composition-list";

export interface UseDbCompositionsOptions {
  filter?: CompositionListFilter;
  kubeconfig?: string;
  toItems?: boolean;
}

export function useDbCompositions(
  options?: UseDbCompositionsOptions
): ReturnType<typeof useSWR<K8sGetResponse>> & {
  items?: CompositionListItem[];
  dbCompositions: CrossplaneCompositionRaw[];
} {
  const r = useCrossplaneCompositionList({
    compositeKind: "DB",
    filter: options?.filter,
    kubeconfig: options?.kubeconfig,
    swrKeySegment: "db-compositions",
    toItems: options?.toItems,
  });

  const { compositions, ...rest } = r;
  return { ...rest, dbCompositions: compositions };
}
