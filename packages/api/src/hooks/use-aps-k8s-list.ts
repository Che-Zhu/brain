"use client";

import { useK8sNamespacedList } from "./use-k8s-namespaced-list";

export type UseApsK8sListOptions = Omit<
  Parameters<typeof useK8sNamespacedList>[0],
  "kind"
>;

export function useApsK8sList(options: UseApsK8sListOptions) {
  return useK8sNamespacedList({ ...options, kind: "aps" });
}
