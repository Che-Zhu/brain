"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import type { DataBrowserHostContext } from "./api/access-types";
import { normalizeDataBrowserEngine } from "./api/engine";

const DataBrowserRuntimeContext = createContext<DataBrowserHostContext | null>(
  null
);

export interface DataBrowserRuntimeProviderProps {
  children: ReactNode;
  kubeconfig: string;
  namespace: string;
  projectUid: string;
  selectedDatabaseData: CanvasDatabaseNodeData;
}

export function createDataBrowserHostContext({
  kubeconfig,
  namespace,
  projectUid,
  selectedDatabaseData,
}: Omit<DataBrowserRuntimeProviderProps, "children">): DataBrowserHostContext {
  const { states, workload } = selectedDatabaseData;

  return {
    database: {
      displayEngine: states.displayEngine,
      ...(states.engineKey === undefined
        ? {}
        : { engineKey: states.engineKey }),
      ...(states.formattedVersion === undefined
        ? {}
        : { formattedVersion: states.formattedVersion }),
      name: states.name,
    },
    databaseWorkloadName: workload.name,
    databaseWorkloadNamespace: workload.namespace,
    engine: normalizeDataBrowserEngine(states.engineKey),
    kubeconfig,
    namespace,
    projectUid,
  };
}

export function DataBrowserRuntimeProvider({
  children,
  kubeconfig,
  namespace,
  projectUid,
  selectedDatabaseData,
}: DataBrowserRuntimeProviderProps) {
  const value = useMemo(
    () =>
      createDataBrowserHostContext({
        kubeconfig,
        namespace,
        projectUid,
        selectedDatabaseData,
      }),
    [kubeconfig, namespace, projectUid, selectedDatabaseData]
  );

  return (
    <DataBrowserRuntimeContext.Provider value={value}>
      {children}
    </DataBrowserRuntimeContext.Provider>
  );
}

export function useDataBrowserRuntime(): DataBrowserHostContext {
  const value = useContext(DataBrowserRuntimeContext);

  if (value === null) {
    throw new Error(
      "useDataBrowserRuntime must be used within DataBrowserRuntimeProvider"
    );
  }

  return value;
}
