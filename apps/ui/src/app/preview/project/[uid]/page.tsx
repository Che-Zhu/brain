"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { useAtomValue } from "jotai";
import { useParams, useSearchParams } from "next/navigation";

import { useProjectServices } from "@/hooks/use-project-services";
import {
  canvasMetaAtom,
  closeCanvasSelection,
  selectedEdgeAtom,
  selectedNodeAtom,
} from "@/store/canvas-store";

/**
 * Client-only: fetches AP list + metrics. Share access is checked in `layout.tsx`.
 */
export default function PreviewProjectPage() {
  const params = useParams<{ uid: string }>();
  const searchParams = useSearchParams();
  const uid = decodeURIComponent(params.uid ?? "");
  const ns = (searchParams.get("ns") ?? "").trim();
  const shareToken = (searchParams.get("shareToken") ?? "").trim();

  const canvasMeta = useAtomValue(canvasMetaAtom);
  const selectedEdge = useAtomValue(selectedEdgeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  const { canvasState, error, isLoading } = useProjectServices({
    auth: { shareToken, type: "share" },
    namespace: ns,
    uid,
  });

  const missingParams = shareToken === "" || ns === "" || uid === "";
  const blocked = missingParams || isLoading || error != null;
  const hasNodes = canvasState.nodes.length > 0;
  const showCanvas = !blocked && hasNodes;

  if (missingParams) {
    return (
      <p className="text-muted-foreground text-sm">
        Missing preview link parameters. Use{" "}
        <code className="rounded bg-muted px-1">shareToken</code> and{" "}
        <code className="rounded bg-muted px-1">ns</code> query params.
      </p>
    );
  }

  if (showCanvas) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <Canvas.Root
          actions={{ onPanelClose: closeCanvasSelection }}
          meta={canvasMeta}
          state={{ ...canvasState, selectedEdge, selectedNode }}
        >
          <Canvas.Flow>
            <Canvas.Panel />
          </Canvas.Flow>
        </Canvas.Root>
      </div>
    );
  }

  return null;
}
