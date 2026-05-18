"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import { ApiUrl } from "@workspace/api/utils";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  createWorkloadTelemetryStore,
  type WorkloadTelemetrySnapshotResponse,
  type WorkloadTelemetrySnapshotState,
  type WorkloadTelemetryStore,
  type WorkloadTelemetryTarget,
} from "./workload-telemetry-store";

const EMPTY_SNAPSHOT_STATE: WorkloadTelemetrySnapshotState = {
  refreshing: false,
};

const WorkloadTelemetryContext = createContext<WorkloadTelemetryStore | null>(
  null
);

export interface WorkloadTelemetryProviderProps {
  children: ReactNode;
  kubeconfig: string;
  refreshIntervalMs?: number;
  selectedTarget?: WorkloadTelemetryTarget | null;
}

export function WorkloadTelemetryProvider({
  children,
  kubeconfig,
  refreshIntervalMs = 5000,
  selectedTarget = null,
}: WorkloadTelemetryProviderProps) {
  const store = useMemo(
    () =>
      createWorkloadTelemetryStore({
        autoRefresh: true,
        fetchSnapshot: (targets) =>
          fetcher<WorkloadTelemetrySnapshotResponse>({
            base: ApiUrl(),
            body: { targets },
            header: {
              Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
            },
            method: "POST",
            path: API_ROUTES.telemetry.metricsSnapshot,
          }),
      }),
    [kubeconfig]
  );

  useEffect(() => {
    store.setSelectedTarget(selectedTarget);
    if (selectedTarget !== null) {
      store.refresh().catch(() => undefined);
    }
  }, [selectedTarget, store]);

  useEffect(() => {
    if (refreshIntervalMs <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      store.refresh().catch(() => undefined);
    }, refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [refreshIntervalMs, store]);

  return (
    <WorkloadTelemetryContext value={store}>
      {children}
    </WorkloadTelemetryContext>
  );
}

export function useWorkloadTelemetrySnapshot(
  target: WorkloadTelemetryTarget | null
): WorkloadTelemetrySnapshotState {
  const store = useContext(WorkloadTelemetryContext);

  return useSyncExternalStore(
    (listener) => {
      if (store === null || target === null) {
        return () => undefined;
      }
      return store.subscribe(target, listener);
    },
    () => {
      if (store === null || target === null) {
        return EMPTY_SNAPSHOT_STATE;
      }
      return store.getSnapshot(target);
    },
    () => EMPTY_SNAPSHOT_STATE
  );
}
