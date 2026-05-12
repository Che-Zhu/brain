"use client";

import { useK8sNamespacedList } from "./use-k8s-namespaced-list";

export type UseDbsK8sListOptions = Omit<
  Parameters<typeof useK8sNamespacedList>[0],
  "kind"
>;

export function useDbsK8sList(options: UseDbsK8sListOptions) {
  return useK8sNamespacedList({ ...options, kind: "dbs" });
}
