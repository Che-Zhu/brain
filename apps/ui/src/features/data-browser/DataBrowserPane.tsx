"use client";

import { MainLayout } from "@data-browser/components/layout/MainLayout";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { useEffect } from "react";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { isDataBrowserEngineVisible } from "./capabilities";
import { useI18n } from "./i18n/useI18n";
import { DataBrowserRuntimeProvider, useDataBrowserRuntime } from "./runtime";
import "./styles/data-browser.css";

export interface DataBrowserPaneProps {
  kubeconfig: string;
  namespace: string;
  projectUid: string;
  selectedDatabaseData: CanvasDatabaseNodeData;
}

function DataBrowserPaneBody() {
  const runtime = useDataBrowserRuntime();
  const { t } = useI18n();
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
      <div data-browser-empty-state>
        <div data-browser-empty-state-card>
          <h3 data-browser-empty-state-title>
            {t("browser.unsupported.title")}
          </h3>
          <p data-browser-empty-state-body>{t("browser.unsupported.body")}</p>
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
      <div
        className="data-browser-theme flex h-full min-h-0 w-full overflow-hidden bg-background"
        data-browser-shell
      >
        <DataBrowserPaneBody />
      </div>
    </DataBrowserRuntimeProvider>
  );
}
