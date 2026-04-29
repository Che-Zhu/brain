"use client";

import { Button } from "@workspace/ui/components/button";
import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { useAtomValue } from "jotai";
import { PanelRightOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useProjectServices } from "@/hooks/use-project-services";
import { encodedKubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import {
  canvasMetaAtom,
  closeCanvasSelection,
  selectedEdgeAtom,
  selectedNodeAtom,
} from "@/store/canvas-store";
import { openRightPane, rightPaneOpenAtom } from "@/store/layout-store";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(encodedKubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const canvasMeta = useAtomValue(canvasMetaAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const selectedEdge = useAtomValue(selectedEdgeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  const meta = useMemo(
    () => ({
      ...canvasMeta,
      upperRight: rightPaneOpen ? undefined : (
        <Button
          aria-label="Open assistant panel"
          className="hoverable rounded-xl"
          onClick={openRightPane}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <PanelRightOpen aria-hidden className="size-4" strokeWidth={2} />
        </Button>
      ),
    }),
    [canvasMeta, rightPaneOpen]
  );

  const { canvasState, error, isLoading } = useProjectServices({
    auth: { kubeconfig, type: "kubeconfig" },
    namespace,
    uid,
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {kubeconfig !== "" &&
        !isLoading &&
        error == null &&
        canvasState.nodes.length > 0 && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Canvas.Root
              actions={{ onPanelClose: closeCanvasSelection }}
              meta={meta}
              state={{ ...canvasState, selectedEdge, selectedNode }}
            >
              <Canvas.Flow>
                <Canvas.Panel />
              </Canvas.Flow>
            </Canvas.Root>
          </div>
        )}
    </div>
  );
}
