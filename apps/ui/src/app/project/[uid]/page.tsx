"use client";

import { Button } from "@workspace/ui/components/button";
import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAtomValue } from "jotai";
import { PanelRightOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useProjectCanvas } from "@/hooks/use-project-canvas";
import { useProjectCanvasLayout } from "@/hooks/use-project-canvas-layout";
import { useProjectServices } from "@/hooks/use-project-services";
import { DatabaseMetricsPane } from "@/lib/project-canvas/panels/database-metrics-pane";
import { telemetryTargetFromCanvasNode } from "@/lib/project-canvas/telemetry/workload-telemetry-node";
import { WorkloadTelemetryProvider } from "@/lib/project-canvas/telemetry/workload-telemetry-react";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { DATABASE_PANE } from "@/store/canvas-store";
import { openRightPane, rightPaneOpenAtom } from "@/store/layout-store";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const projectCanvasLayout = useProjectCanvasLayout({
    enabled: kubeconfig.trim() !== "",
    namespace,
    projectUid: uid,
  });

  const { canvasState, error, isEmptyGraphLoading, refreshWorkloadLists } =
    useProjectServices({
      canvasLayout: projectCanvasLayout.layout,
      canvasLayoutReady: projectCanvasLayout.layoutReady,
      kubeconfig,
      namespace,
      onCanvasLayoutMerge: projectCanvasLayout.saveLayoutNodes,
      uid,
    });

  const {
    clearSelection,
    closeDatabasePane,
    databasePane,
    meta,
    nodes,
    selectedEdge,
    selectedNode,
  } = useProjectCanvas(canvasState.nodes, {
    kubeconfig,
    onNodePositionChange: projectCanvasLayout.scheduleNodePositionSave,
    refreshWorkloadLists,
  });
  const selectedTelemetryTarget = useMemo(
    () => telemetryTargetFromCanvasNode(selectedNode),
    [selectedNode]
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
              actions={{ onPanelClose: clearSelection }}
              key={`${namespace}:${uid}`}
              meta={meta}
              state={{
                ...canvasState,
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
                  <Canvas.UpperRight>
                    {rightPaneOpen ? null : (
                      <Button
                        aria-label="Open assistant panel"
                        className="hoverable rounded-xl"
                        onClick={openRightPane}
                        size="icon-lg"
                        type="button"
                        variant="ghost"
                      >
                        <PanelRightOpen
                          aria-hidden
                          className="size-4"
                          strokeWidth={2}
                        />
                      </Button>
                    )}
                  </Canvas.UpperRight>
                  <Canvas.Panel />
                  <DatabaseMetricsPane
                    kubeconfig={kubeconfig}
                    node={selectedNode}
                    onClose={closeDatabasePane}
                    open={databasePane === DATABASE_PANE.metrics}
                  />
                </Canvas.Flow>
              </div>
            </Canvas.Root>
          </WorkloadTelemetryProvider>
        </div>
      )}
    </div>
  );
}
