"use client";

import {
  useApsK8sList,
  useApTelemetryMetricsBatch,
} from "@workspace/api/hooks";
import { apNamespaceNameTargetsFromList } from "@workspace/api/lib/ap-list";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { Canvas } from "@workspace/ui/components/canvas/canvas";
import type { CanvasState } from "@workspace/ui/components/canvas/canvas.types";
import { useAtomValue } from "jotai";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  apMetricsLookupFromResults,
  apsToCanvasState,
} from "@/lib/project-canvas/flow/ap-list-to-canvas-state";
import {
  canvasMetaAtom,
  closeCanvasSelection,
  selectedEdgeAtom,
  selectedNodeAtom,
} from "@/store/canvas-store";

const METRICS_REFRESH_MS = 5000;

/** Share-token preview only (kubeconfig path uses `useProjectServices` on `/project/[uid]`). */
function usePreviewProjectCanvas(options: {
  namespace: string;
  shareToken: string;
  uid: string;
}): {
  canvasState: CanvasState;
  error: Error | undefined;
  isLoading: boolean;
} {
  const { namespace, shareToken, uid } = options;

  const labelSelector = useMemo(() => `${PROJECT_UID_LABEL}=${uid}`, [uid]);

  const { data, error, isLoading } = useApsK8sList({
    labelSelector,
    namespace,
    shareToken: shareToken.trim() === "" ? undefined : shareToken.trim(),
  });

  const apMetricsTargets = useMemo(
    () =>
      apNamespaceNameTargetsFromList(data, namespace).map((t) => ({
        ...t,
        kind: "ap" as const,
      })),
    [data, namespace]
  );

  const st = shareToken.trim();
  const { data: apMetrics } = useApTelemetryMetricsBatch({
    refreshInterval: METRICS_REFRESH_MS,
    shareToken: st === "" ? undefined : st,
    targets: apMetricsTargets,
  });

  const metricsLookup = useMemo(
    () => apMetricsLookupFromResults(apMetrics),
    [apMetrics]
  );

  const canvasState = useMemo((): CanvasState => {
    const { edges, nodes } = apsToCanvasState(data, {
      metricsLookup,
      namespaceFallback: namespace,
    });
    return { edges, nodes, selectedEdge: null, selectedNode: null };
  }, [data, namespace, metricsLookup]);

  return { canvasState, error, isLoading };
}

/**
 * Client-only: fetches AP list + metrics via share token. Share access is checked in `layout.tsx`.
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

  const { canvasState, error, isLoading } = usePreviewProjectCanvas({
    namespace: ns,
    shareToken,
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
