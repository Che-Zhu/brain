import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { CanvasState } from "@workspace/ui/components/canvas/canvas.types";

import {
  apsToCanvasState,
  dbsToCanvasState,
  entryPointsToCanvasState,
  type WorkloadMetricPercents,
} from "../flow/ap-list-to-canvas-state";
import { mergeCanvasLayoutWithDetectedNodes } from "../layout/merge";
import type { CanvasLayoutDocument } from "../layout/types";

export interface PreviewProjectCanvasStateOptions {
  apMetricsLookup?: Map<string, WorkloadMetricPercents>;
  apsData: K8sGetResponse | undefined;
  canvasLayout: CanvasLayoutDocument | undefined;
  canvasLayoutReady?: boolean;
  dbsData: K8sGetResponse | undefined;
  entryPointsData: K8sGetResponse | undefined;
  namespace: string;
}

export function buildPreviewProjectCanvasState({
  apMetricsLookup,
  apsData,
  canvasLayout,
  canvasLayoutReady = true,
  dbsData,
  entryPointsData,
  namespace,
}: PreviewProjectCanvasStateOptions): CanvasState {
  const apBlock = apsToCanvasState(apsData, {
    metricsLookup: apMetricsLookup,
    namespaceFallback: namespace,
  });
  const dbBlock = dbsToCanvasState(dbsData, {
    gridIndexOffset: apBlock.nodes.length,
    namespaceFallback: namespace,
  });
  const entryPointBlock = entryPointsToCanvasState(entryPointsData, {
    gridIndexOffset: apBlock.nodes.length + dbBlock.nodes.length,
    namespaceFallback: namespace,
  });

  const nodes = [...apBlock.nodes, ...dbBlock.nodes, ...entryPointBlock.nodes];
  const edges = [...apBlock.edges, ...dbBlock.edges, ...entryPointBlock.edges];
  const merge = canvasLayoutReady
    ? mergeCanvasLayoutWithDetectedNodes({
        layout: canvasLayout,
        nodes,
      })
    : { nodes: [] };

  return {
    edges: canvasLayoutReady ? edges : [],
    nodes: merge.nodes,
    selectedEdge: null,
    selectedNode: null,
  };
}
