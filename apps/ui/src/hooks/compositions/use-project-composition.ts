"use client";

/**
 * Lists Crossplane Compositions targeting the **Project** XR (`spec.compositeTypeRef.kind === "Project"`).
 */

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type useSWR from "swr";
import { useCrossplaneCompositionList } from "@/hooks/use-crossplane-composition-list";
import type {
  CompositionListFilter,
  CompositionListItem,
  CrossplaneCompositionRaw,
} from "@/lib/crossplane-composition-list";

export interface UseProjectCompositionsOptions {
  filter?: CompositionListFilter;
  kubeconfig?: string;
  toItems?: boolean;
}

export function useProjectCompositions(
  options?: UseProjectCompositionsOptions
): ReturnType<typeof useSWR<K8sGetResponse>> & {
  items?: CompositionListItem[];
  projectCompositions: CrossplaneCompositionRaw[];
} {
  const r = useCrossplaneCompositionList({
    compositeKind: "Project",
    filter: options?.filter,
    kubeconfig: options?.kubeconfig,
    swrKeySegment: "project-compositions",
    toItems: options?.toItems,
  });

  const { compositions, ...rest } = r;
  return { ...rest, projectCompositions: compositions };
}
