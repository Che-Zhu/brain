"use client";

import { MainLayout } from "@data-browser/components/layout/MainLayout";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { useEffect } from "react";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { isDataBrowserEngineVisible } from "./capabilities";
import { DataBrowserRuntimeProvider, useDataBrowserRuntime } from "./runtime";

export interface DataBrowserPaneProps {
  kubeconfig: string;
  namespace: string;
  projectUid: string;
  selectedDatabaseData: CanvasDatabaseNodeData;
}

function DataBrowserPaneBody() {
  const runtime = useDataBrowserRuntime();
  const engineVisible = isDataBrowserEngineVisible(runtime.engine);
  const initializeRuntimeConnection = useConnectionStore(
    (state) => state.initializeRuntimeConnection
  );

  useEffect(() => {
    if (engineVisible) {
      initializeRuntimeConnection(runtime);
    }
  }, [engineVisible, initializeRuntimeConnection, runtime]);

  if (!engineVisible) {
    return (
      <div className="grid h-full min-h-64 place-items-center p-8">
        <div className="w-full max-w-md rounded-lg border border-resource-pane-border bg-resource-pane/88 p-4">
          <h3 className="m-0 font-medium text-sm leading-5">
            {"Unsupported database engine"}
          </h3>
          <p className="mt-1.5 mb-0 text-[13px] text-resource-pane-muted leading-5">
            {
              "This database engine is not available in the first browser version."
            }
          </p>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}

export function DataBrowserPane({
  kubeconfig,
  namespace,
  projectUid,
  selectedDatabaseData,
}: DataBrowserPaneProps) {
  return (
    <DataBrowserRuntimeProvider
      kubeconfig={kubeconfig}
      namespace={namespace}
      projectUid={projectUid}
      selectedDatabaseData={selectedDatabaseData}
    >
      <div className="flex h-full min-h-0 w-full overflow-hidden text-resource-pane-foreground">
        <DataBrowserPaneBody />
      </div>
    </DataBrowserRuntimeProvider>
  );
}
