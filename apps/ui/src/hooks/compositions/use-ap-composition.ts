"use client";

/**
 * Lists Crossplane Compositions targeting the **AP** XR (`spec.compositeTypeRef.kind === "AP"`).
 */

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type useSWR from "swr";
import { useCrossplaneCompositionList } from "@/hooks/use-crossplane-composition-list";
import type {
  CompositionListFilter,
  CompositionListItem,
  CrossplaneCompositionRaw,
} from "@/lib/crossplane-composition-list";

export interface UseApCompositionsOptions {
  filter?: CompositionListFilter;
  kubeconfig?: string;
  toItems?: boolean;
}

export function useApCompositions(
  options?: UseApCompositionsOptions
): ReturnType<typeof useSWR<K8sGetResponse>> & {
  items?: CompositionListItem[];
  apCompositions: CrossplaneCompositionRaw[];
} {
  const r = useCrossplaneCompositionList({
    compositeKind: "AP",
    filter: options?.filter,
    kubeconfig: options?.kubeconfig,
    swrKeySegment: "ap-compositions",
    toItems: options?.toItems,
  });

  const { compositions, ...rest } = r;
  return { ...rest, apCompositions: compositions };
}
