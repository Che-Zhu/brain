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

export type DbLifecycleActionKey =
  | "delete"
  | "public-access"
  | "restart"
  | "start"
  | "stop";

function workloadKey(workload: DbLifecycleWorkloadRef): string {
  return `${workload.namespace.trim()}/${workload.name.trim()}`;
}

function workloadActionKey(
  workload: DbLifecycleWorkloadRef,
  action: DbLifecycleActionKey
): string {
  return `${workloadKey(workload)}:${action}`;
}

function validateWorkload(workload: DbLifecycleWorkloadRef): {
  name: string;
  namespace: string;
} {
  const name = workload.name.trim();
  const namespace = workload.namespace.trim();
  if (name === "" || namespace === "") {
    throw new Error("useDbLifecycle: workload name and namespace are required");
  }
  return { name, namespace };
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
 * - **Start/stop** → `POST /api/db/v1alpha1/start|stop`, patching `spec.paused`.
 * - **Restart** → `POST /api/db/v1alpha1/restart`, server-incrementing `spec.restartRequest`.
 * - **Delete** → claim DELETE, preserving terminationPolicy semantics.
 * - **Public access** → `spec.exposeNodePort` -> KubeBlocks NodePort Service reconciliation.
 */
export function useDbLifecycleOperations(options: UseDbLifecycleOptions) {
  const kubeconfig = options.kubeconfig ?? "";
  const shareToken = options.shareToken ?? "";
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(() => new Set());

  const headers = useMemo((): Record<string, string> => {
    const st = shareToken.trim();
    if (st !== "") {
      return { "X-Share-Token": st };
    }
    return { Authorization: `Bearer ${encodeURIComponent(kubeconfig)}` };
  }, [kubeconfig, shareToken]);

  const authReady = shareToken.trim() !== "" || kubeconfig.trim() !== "";

  const base = useMemo(() => ApiUrl(), []);

  const runWithLoading = useCallback(
    async (
      workload: DbLifecycleWorkloadRef,
      action: DbLifecycleActionKey,
      operation: () => Promise<unknown>
    ) => {
      const key = workloadActionKey(workload, action);
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        await operation();
      } finally {
        setLoadingKeys((prev) => {
          if (!prev.has(key)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    []
  );

  const isLoading = useCallback(
    (workload: DbLifecycleWorkloadRef, action: DbLifecycleActionKey) =>
      loadingKeys.has(workloadActionKey(workload, action)),
    [loadingKeys]
  );

  const isToggling = useCallback(
    (workload: DbLifecycleWorkloadRef) =>
      loadingKeys.has(workloadActionKey(workload, "public-access")),
    [loadingKeys]
  );

  const assertAuthReady = useCallback(() => {
    if (!authReady) {
      throw new Error("useDbLifecycle: kubeconfig or shareToken is required");
    }
  }, [authReady]);

  const startWorkload = useCallback(
    async (workload: DbLifecycleWorkloadRef) => {
      assertAuthReady();
      const body = validateWorkload(workload);
      await runWithLoading(workload, "start", () =>
        fetcher<unknown>({
          base,
          body,
          header: headers,
          method: "POST",
          path: API_ROUTES.db.start,
        })
      );
    },
    [assertAuthReady, base, headers, runWithLoading]
  );

  const stopWorkload = useCallback(
    async (workload: DbLifecycleWorkloadRef) => {
      assertAuthReady();
      const body = validateWorkload(workload);
      await runWithLoading(workload, "stop", () =>
        fetcher<unknown>({
          base,
          body,
          header: headers,
          method: "POST",
          path: API_ROUTES.db.stop,
        })
      );
    },
    [assertAuthReady, base, headers, runWithLoading]
  );

  const restartWorkload = useCallback(
    async (workload: DbLifecycleWorkloadRef) => {
      assertAuthReady();
      const body = validateWorkload(workload);
      await runWithLoading(workload, "restart", () =>
        fetcher<unknown>({
          base,
          body,
          header: headers,
          method: "POST",
          path: API_ROUTES.db.restart,
        })
      );
    },
    [assertAuthReady, base, headers, runWithLoading]
  );

  const deleteWorkload = useCallback(
    async (workload: DbLifecycleWorkloadRef) => {
      assertAuthReady();
      const { name, namespace } = validateWorkload(workload);
      await runWithLoading(workload, "delete", () =>
        fetcher<unknown>({
          base,
          header: headers,
          method: "DELETE",
          path: API_ROUTES.db.root,
          query: { name, namespace },
        })
      );
    },
    [assertAuthReady, base, headers, runWithLoading]
  );

  const togglePublicAccess = useCallback(
    async (workload: DbLifecycleWorkloadRef, nextEnabled: boolean) => {
      assertAuthReady();
      validateWorkload(workload);
      await runWithLoading(workload, "public-access", async () => {
        await mergePatchDb(base, headers, workload, {
          spec: { exposeNodePort: nextEnabled },
        });
      });
    },
    [assertAuthReady, base, headers, runWithLoading]
  );

  return {
    authReady,
    deleteWorkload,
    isLoading,
    isToggling,
    restartWorkload,
    startWorkload,
    stopWorkload,
    togglePublicAccess,
  };
}
