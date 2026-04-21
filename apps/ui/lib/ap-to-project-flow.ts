import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { PROJECT_FLOW_NODE_TYPE_CONTAINER } from "@workspace/ui/components/project-flow/project-flow-nodes";
import type { Edge, Node } from "@xyflow/react";

import { apItemsFromList } from "@/lib/ap-names-from-k8s-list";

const COL = 280;
const ROW = 220;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

function metadataName(item: unknown): string | undefined {
  const meta = asRecord(asRecord(item)?.metadata)?.name;
  return typeof meta === "string" ? meta : undefined;
}

function metadataUid(item: unknown): string | undefined {
  const uid = asRecord(asRecord(item)?.metadata)?.uid;
  return typeof uid === "string" ? uid : undefined;
}

/**
 * Maps one AP list item (example.crossplane.io/v1 `AP`) into {@link ContainerNodeStates}.
 * Currently only **kind**, **image**, and **name** (no CPU/memory %, replicas, or status).
 */
export function apToWorkloadStates(ap: unknown): ContainerNodeStates {
  const root = asRecord(ap) ?? {};
  const spec = asRecord(root.spec) ?? {};
  const meta = asRecord(root.metadata) ?? {};

  const name =
    typeof meta.name === "string" && meta.name !== "" ? meta.name : "unknown";
  const image =
    typeof spec.image === "string" && spec.image.trim() !== ""
      ? spec.image
      : "—";

  return {
    kind: "AP",
    name,
    image,
  };
}

/**
 * Builds React Flow `initialNodes` / `initialEdges` for the project AP list.
 */
export function apsToProjectFlowState(
  data: K8sGetResponse | undefined
): { initialEdges: Edge[]; initialNodes: Node[] } {
  const items = apItemsFromList(data);
  const initialNodes: Node[] = items.map((item, i) => {
    const stable = metadataName(item) ?? metadataUid(item) ?? `i-${i}`;
    return {
      id: `ap-${String(stable).replace(/\s+/g, "-")}`,
      type: PROJECT_FLOW_NODE_TYPE_CONTAINER,
      position: { x: (i % 3) * COL, y: Math.floor(i / 3) * ROW },
      data: { states: apToWorkloadStates(item) },
    };
  });
  return { initialNodes, initialEdges: [] };
}
