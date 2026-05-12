"use client";

import { Button } from "@workspace/ui/components/button";
import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { useAtomValue } from "jotai";
import { PanelRightOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { useProjectServices } from "@/hooks/use-project-services";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import {
  selectedEdgeAtom,
  useCanvasMeta,
  useCanvasSelectionActions,
  useSelectedCanvasNode,
} from "@/store/canvas-store";
import { openRightPane, rightPaneOpenAtom } from "@/store/layout-store";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const canvasMeta = useCanvasMeta();
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const selectedEdge = useAtomValue(selectedEdgeAtom);
  const { clearSelection } = useCanvasSelectionActions();

  const { canvasState, error, isLoading } = useProjectServices({
    kubeconfig,
    namespace,
    uid,
  });

  const selectedNode = useSelectedCanvasNode(canvasState.nodes);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {kubeconfig !== "" &&
        !isLoading &&
        error == null &&
        canvasState.nodes.length > 0 && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Canvas.Root
              actions={{ onPanelClose: clearSelection }}
              meta={canvasMeta}
              state={{ ...canvasState, selectedEdge, selectedNode }}
            >
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
              </Canvas.Flow>
            </Canvas.Root>
          </div>
        )}
    </div>
  );
}
