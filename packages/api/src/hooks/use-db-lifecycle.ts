"use client";

import { useCallback, useMemo, useState } from "react";

import { API_ROUTES } from "../constants";
import { fetcher } from "../fetch";
import { ApiUrl } from "../utils";

export interface UseDbLifecycleOptions {
  kubeconfig?: string;
  /** Share-token preview auth (alternative to bearer kubeconfig). */
  shareToken?: string;
}

export interface DbLifecycleWorkloadRef {
  /** DB `metadata.name`. */
  name: string;
  namespace: string;
}

function workloadKey(workload: DbLifecycleWorkloadRef): string {
  return `${workload.namespace.trim()}/${workload.name.trim()}`;
}

function mergePatchDb(
  base: string,
  header: Record<string, string>,
  workload: DbLifecycleWorkloadRef,
  patch: Record<string, unknown>
): Promise<unknown> {
  const name = workload.name.trim();
  const namespace = workload.namespace.trim();
  if (name === "" || namespace === "") {
    return Promise.reject(
      new Error("useDbLifecycle: workload name and namespace are required")
    );
  }
  return fetcher<unknown>({
    base,
    body: patch,
    header,
    method: "PATCH",
    path: API_ROUTES.db.root,
    query: { name, namespace },
  });
}

/**
 * Imperative lifecycle for **example.crossplane.io/v1** `DB` workloads.
 *
 * Currently exposes only the public-access switch:
 * `spec.exposeNodePort` -> KubeBlocks NodePort Service reconciliation.
 */
export function useDbLifecycleOperations(options: UseDbLifecycleOptions) {
  const kubeconfig = options.kubeconfig ?? "";
  const shareToken = options.shareToken ?? "";
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(
    () => new Set()
  );

  const headers = useMemo((): Record<string, string> => {
    const st = shareToken.trim();
    if (st !== "") {
      return { "X-Share-Token": st };
    }
    return { Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` };
  }, [kubeconfig, shareToken]);

  const authReady = shareToken.trim() !== "" || kubeconfig.trim() !== "";

  const base = useMemo(() => ApiUrl(), []);

  const isToggling = useCallback(
    (workload: DbLifecycleWorkloadRef) =>
      togglingKeys.has(workloadKey(workload)),
    [togglingKeys]
  );

  const togglePublicAccess = useCallback(
    async (workload: DbLifecycleWorkloadRef, nextEnabled: boolean) => {
      if (!authReady) {
        throw new Error("useDbLifecycle: kubeconfig or shareToken is required");
      }

      const name = workload.name.trim();
      const namespace = workload.namespace.trim();
      if (name === "" || namespace === "") {
        throw new Error(
          "useDbLifecycle: workload name and namespace are required"
        );
      }

      const key = workloadKey(workload);
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        await mergePatchDb(base, headers, workload, {
          spec: { exposeNodePort: nextEnabled },
        });
      } finally {
        setTogglingKeys((prev) => {
          if (!prev.has(key)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [authReady, base, headers]
  );

  return {
    authReady,
    isToggling,
    togglePublicAccess,
  };
}
