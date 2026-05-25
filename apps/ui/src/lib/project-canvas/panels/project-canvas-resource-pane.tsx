"use client";

import type { Node } from "@xyflow/react";
import type { ReactNode } from "react";

import type { CanvasEntrySelectionRef } from "@/lib/project-canvas/nodes/entry-node-selection";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { DATABASE_PANE, ENTRY_PANE, WORKLOAD_PANE } from "@/store/canvas-store";
import { CanvasResourcePanePresence } from "./canvas-resource-pane";
import { DatabaseMetricsPane } from "./database-metrics-pane";
import { DatabaseSettingsPane } from "./database-settings-pane";
import { EntryPointSettingsPane } from "./entrypoint-settings-panel";
import type { SettingsLeaveGuardRegistration } from "./settings-leave-guard";
import { WorkloadResourcePane } from "./workload-resource-pane";

function isWorkloadPaneMode(mode: string | null | undefined): boolean {
  return (
    mode === WORKLOAD_PANE.settings ||
    mode === WORKLOAD_PANE.metrics ||
    mode === WORKLOAD_PANE.logs ||
    mode === WORKLOAD_PANE.history
  );
}

export function ProjectCanvasResourcePane({
  databasePane,
  entryPane,
  kubeconfig,
  onClose,
  onSettingsLeaveGuardChange,
  onUpdated,
  readOnly = false,
  selectedDatabaseData,
  selectedEntryRef,
  selectedNode,
  shareToken,
  workloadPane,
}: {
  databasePane: string | null | undefined;
  entryPane: string | null | undefined;
  kubeconfig?: string;
  onClose: () => void;
  onSettingsLeaveGuardChange?: SettingsLeaveGuardRegistration;
  onUpdated?: () => Promise<unknown>;
  readOnly?: boolean;
  selectedDatabaseData: CanvasDatabaseNodeData | null;
  selectedEntryRef: CanvasEntrySelectionRef | null;
  selectedNode: Node | null;
  shareToken?: string;
  workloadPane: string | null | undefined;
}) {
  let pane: ReactNode = null;

  if (selectedNode != null && isWorkloadPaneMode(workloadPane)) {
    pane = (
      <WorkloadResourcePane
        mode={workloadPane}
        node={selectedNode}
        onClose={onClose}
        onSettingsLeaveGuardChange={onSettingsLeaveGuardChange}
      />
    );
  } else if (
    databasePane === DATABASE_PANE.metrics &&
    selectedDatabaseData != null
  ) {
    pane = (
      <DatabaseMetricsPane
        kubeconfig={kubeconfig}
        node={selectedNode}
        onClose={onClose}
        open
      />
    );
  } else if (
    databasePane === DATABASE_PANE.settings &&
    selectedDatabaseData != null
  ) {
    pane = (
      <DatabaseSettingsPane
        data={selectedDatabaseData}
        kubeconfig={kubeconfig}
        onClose={onClose}
        onSettingsLeaveGuardChange={onSettingsLeaveGuardChange}
        onUpdated={onUpdated}
      />
    );
  } else if (entryPane === ENTRY_PANE.settings && selectedEntryRef != null) {
    pane = (
      <EntryPointSettingsPane
        kubeconfig={kubeconfig}
        onClose={onClose}
        onSettingsLeaveGuardChange={onSettingsLeaveGuardChange}
        onUpdated={onUpdated}
        readOnly={readOnly}
        selection={selectedEntryRef}
        shareToken={shareToken}
      />
    );
  }

  return <CanvasResourcePanePresence>{pane}</CanvasResourcePanePresence>;
}
