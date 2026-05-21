import type { Node } from "@xyflow/react";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function nodeLayoutExpanded(node: Node): boolean | undefined {
  const data = asRecord(node.data);
  const layout = asRecord(data?.layout);
  return typeof layout?.expanded === "boolean" ? layout.expanded : undefined;
}

function nodeGeneratedPosition(node: Node): Node["position"] | undefined {
  const data = asRecord(node.data);
  const layout = asRecord(data?.layout);
  const generatedPosition = asRecord(layout?.generatedPosition);
  const x = generatedPosition?.x;
  const y = generatedPosition?.y;
  if (typeof x !== "number" || typeof y !== "number") {
    return undefined;
  }
  return { x, y };
}

function hasGeneratedPositionSource(node: Node): boolean {
  const data = asRecord(node.data);
  const layout = asRecord(data?.layout);
  return layout?.positionSource === "generated";
}

function positionsEqual(a: Node["position"], b: Node["position"]): boolean {
  return a.x === b.x && a.y === b.y;
}

function shouldUseIncomingPosition(existing: Node, incoming: Node): boolean {
  if (!hasGeneratedPositionSource(incoming)) {
    return false;
  }
  const generatedPosition = nodeGeneratedPosition(existing);
  return (
    generatedPosition === undefined ||
    positionsEqual(existing.position, generatedPosition)
  );
}

function mergeNodeData(existing: Node, incoming: Node): Node["data"] {
  const existingExpanded = nodeLayoutExpanded(existing);
  if (existingExpanded === undefined) {
    return incoming.data;
  }

  const incomingData = asRecord(incoming.data) ?? {};
  const incomingLayout = asRecord(incomingData.layout) ?? {};
  return {
    ...incomingData,
    layout: {
      ...incomingLayout,
      expanded: existingExpanded,
    },
  };
}

export function mergeNodes(prev: Node[], next: Node[]): Node[] {
  const prevById = new Map(prev.map((node) => [node.id, node]));
  return next.map((incoming) => {
    const existing = prevById.get(incoming.id);
    if (existing === undefined) {
      return incoming;
    }

    return {
      ...incoming,
      data: mergeNodeData(existing, incoming),
      position: shouldUseIncomingPosition(existing, incoming)
        ? incoming.position
        : existing.position,
    };
  });
}
