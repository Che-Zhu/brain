"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { SidePanePresence } from "@workspace/ui/components/side-pane";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GitHubDeploymentPane } from "@/components/github-deployment-pane";
import { useProjectCanvas } from "@/hooks/use-project-canvas";
import { useProjectCanvasLayout } from "@/hooks/use-project-canvas-layout";
import { useProjectServices } from "@/hooks/use-project-services";
import {
  addPendingApDbCanvasReferences,
  type PendingApDbCanvasReference,
  pendingApDbCanvasConnectionEdges,
  removePendingApDbCanvasReferences,
} from "@/lib/project-canvas/flow/pending-connections";
import { isCanvasNodeGeneratedPosition } from "@/lib/project-canvas/layout/placement";
import { databaseNodeDataFromNode } from "@/lib/project-canvas/nodes/database-node-data";
import { ProjectCanvasResourcePane } from "@/lib/project-canvas/panels/project-canvas-resource-pane";
import { telemetryTargetFromCanvasNode } from "@/lib/project-canvas/telemetry/workload-telemetry-node";
import { WorkloadTelemetryProvider } from "@/lib/project-canvas/telemetry/workload-telemetry-react";
import type { ProjectSidePaneSurface } from "@/lib/project-side-pane/controller";
import { useProjectSidePaneSurface } from "@/lib/project-side-pane/react";
import { projectCanvasEntryForAssistantIntent } from "@/lib/project-side-pane/surface-intents";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

const GITHUB_DEPLOYMENT_PANE_QUERY_KEY = "githubDeployment" as const;

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const [pendingApDbReferences, setPendingApDbReferences] = useState<
    PendingApDbCanvasReference[]
  >([]);
  const projectCanvasLayout = useProjectCanvasLayout({
    enabled: kubeconfig.trim() !== "",
    namespace,
    projectUid: uid,
  });

  const {
    canvasState,
    data: projectServicesData,
    error,
    isEmptyGraphLoading,
    refreshWorkloadLists,
  } = useProjectServices({
    canvasLayout: projectCanvasLayout.layout,
    canvasLayoutReady: projectCanvasLayout.layoutReady,
    kubeconfig,
    namespace,
    onCanvasLayoutMerge: projectCanvasLayout.saveLayoutNodes,
    uid,
  });
  const beginPendingApDbReferences = useCallback(
    (references: readonly PendingApDbCanvasReference[]) => {
      const referenceIds = references.map((reference) => reference.id);
      setPendingApDbReferences((current) =>
        addPendingApDbCanvasReferences(current, references)
      );
      return () => {
        setPendingApDbReferences((current) =>
          removePendingApDbCanvasReferences(current, referenceIds)
        );
      };
    },
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pending edges when the canvas route scope changes.
  useEffect(() => {
    setPendingApDbReferences([]);
  }, [namespace, uid]);
  const canvasEdges = useMemo(() => {
    const pendingEdges = pendingApDbCanvasConnectionEdges({
      existingEdges: canvasState.edges,
      nodes: canvasState.nodes,
      pendingReferences: pendingApDbReferences,
    });
    return pendingEdges.length === 0
      ? canvasState.edges
      : [...canvasState.edges, ...pendingEdges];
  }, [canvasState.edges, canvasState.nodes, pendingApDbReferences]);

  const {
    closeResourcePane,
    connectionOrigin,
    databasePane,
    entryPane,
    meta: canvasMeta,
    nodes,
    registerSettingsLeaveGuard,
    requestResourcePaneReplacement,
    selectedEntryRef,
    selectedEdge,
    selectedNode,
    settingsLeaveGuardDialog,
    workloadPane,
  } = useProjectCanvas(canvasState.nodes, {
    dbsData: projectServicesData.dbs,
    kubeconfig,
    namespace,
    onNodeExpansionChange: projectCanvasLayout.scheduleNodeLayoutSave,
    onNodePositionChange: projectCanvasLayout.scheduleNodeLayoutSave,
    onNodeStackOrderChange: projectCanvasLayout.scheduleNodeLayoutSave,
    onPendingApDbReferencesStart: beginPendingApDbReferences,
    refreshWorkloadLists,
    selectionReady: !isEmptyGraphLoading,
  });
  const [githubDeploymentPaneOpen, setGithubDeploymentPaneOpen] = useQueryState(
    GITHUB_DEPLOYMENT_PANE_QUERY_KEY,
    parseAsBoolean.withDefault(false)
  );
  const selectedTelemetryTarget = useMemo(
    () => telemetryTargetFromCanvasNode(selectedNode),
    [selectedNode]
  );
  const selectedDatabaseData = databaseNodeDataFromNode(selectedNode);
  const canvasResourcePaneOpen = Boolean(
    workloadPane ?? databasePane ?? entryPane
  );
  const closeGithubDeploymentPane = useCallback(() => {
    Promise.resolve(setGithubDeploymentPaneOpen(false)).catch(() => undefined);
  }, [setGithubDeploymentPaneOpen]);
  const openGithubDeploymentPane = useCallback(() => {
    requestResourcePaneReplacement(() => {
      Promise.resolve(setGithubDeploymentPaneOpen(true)).catch(() => undefined);
    });
  }, [requestResourcePaneReplacement, setGithubDeploymentPaneOpen]);
  const projectCanvasSidePaneSurface = useMemo<ProjectSidePaneSurface>(
    () => ({
      id: `project-canvas:${uid}`,
      openAssistantIntent: (intent) => {
        const entry = projectCanvasEntryForAssistantIntent(intent, {
          projectUid: uid,
        });
        if (entry?.kind !== "githubDeployment") {
          return { status: "ignored" as const };
        }
        openGithubDeploymentPane();
        return { status: "handled" as const };
      },
    }),
    [openGithubDeploymentPane, uid]
  );
  useProjectSidePaneSurface(projectCanvasSidePaneSurface);
  useEffect(() => {
    if (githubDeploymentPaneOpen && canvasResourcePaneOpen) {
      setGithubDeploymentPaneOpen(false).catch(() => undefined);
    }
  }, [
    canvasResourcePaneOpen,
    githubDeploymentPaneOpen,
    setGithubDeploymentPaneOpen,
  ]);
  const meta = useMemo(
    () => ({
      ...canvasMeta,
      openingFitView: {
        key: `${namespace}:${uid}`,
      },
      viewportFollow: {
        isFollowTarget: isCanvasNodeGeneratedPosition,
        key: `${namespace}:${uid}`,
      },
    }),
    [canvasMeta, namespace, uid]
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {kubeconfig !== "" && error == null && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkloadTelemetryProvider
            kubeconfig={kubeconfig}
            selectedTarget={selectedTelemetryTarget}
          >
            <Canvas.Root
              key={`${namespace}:${uid}`}
              meta={meta}
              state={{
                ...canvasState,
                connectionOrigin,
                edges: canvasEdges,
                nodes,
                selectedEdge,
                selectedNode,
              }}
            >
              <div className="relative min-h-0 flex-1">
                {isEmptyGraphLoading ? (
                  <div
                    aria-live="polite"
                    className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[min(100%-2rem,20rem)]"
                    data-slot="project-canvas-loading-toast"
                    role="status"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
                      <Spinner
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="font-medium text-foreground text-sm">
                        Loading workloads…
                      </span>
                    </div>
                  </div>
                ) : null}
                <Canvas.Flow>
                  <ProjectCanvasResourcePane
                    databasePane={databasePane}
                    entryPane={entryPane}
                    kubeconfig={kubeconfig}
                    onClose={closeResourcePane}
                    onSettingsLeaveGuardChange={registerSettingsLeaveGuard}
                    onUpdated={refreshWorkloadLists}
                    selectedDatabaseData={selectedDatabaseData}
                    selectedEntryRef={selectedEntryRef}
                    selectedNode={selectedNode}
                    workloadPane={workloadPane}
                  />
                  <SidePanePresence>
                    {githubDeploymentPaneOpen && !canvasResourcePaneOpen ? (
                      <GitHubDeploymentPane
                        onClose={closeGithubDeploymentPane}
                      />
                    ) : null}
                  </SidePanePresence>
                  {settingsLeaveGuardDialog}
                </Canvas.Flow>
              </div>
            </Canvas.Root>
          </WorkloadTelemetryProvider>
        </div>
      )}
    </div>
  );
}
