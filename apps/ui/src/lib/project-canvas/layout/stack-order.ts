import type { CanvasLayoutNode, CanvasLayoutResourceRef } from "./types";

export const CANVAS_STACK_ORDER_RETURN_STABILITY_MS = 10_000;

export interface CanvasStackOrderItem {
  key: string;
  ref: CanvasLayoutResourceRef;
  stackOrder?: number;
}

export interface BringCanvasStackOrderItemToFrontResult {
  changed: boolean;
  stackOrder?: number;
}

const DEFAULT_LAYER_BY_KIND: Record<CanvasLayoutResourceRef["kind"], number> = {
  AP: 0,
  DB: 1,
  EntryPoint: 2,
};

function finiteInteger(value: number | undefined): number | undefined {
  return Number.isInteger(value) && Number.isFinite(value) ? value : undefined;
}

function defaultCanvasStackLayer(ref: CanvasLayoutResourceRef): number {
  return DEFAULT_LAYER_BY_KIND[ref.kind];
}

function compareImplicitStackItems(
  a: CanvasStackOrderItem,
  b: CanvasStackOrderItem
): number {
  const layerDiff =
    defaultCanvasStackLayer(a.ref) - defaultCanvasStackLayer(b.ref);
  if (layerDiff !== 0) {
    return layerDiff;
  }
  return 0;
}

export function resolveCanvasStackOrderRanks(
  items: readonly CanvasStackOrderItem[]
): Map<string, number> {
  const withIndex = items.map((item, index) => ({ index, item }));
  const sorted = [...withIndex].sort((a, b) => {
    const aStackOrder = finiteInteger(a.item.stackOrder);
    const bStackOrder = finiteInteger(b.item.stackOrder);
    if (aStackOrder === undefined && bStackOrder === undefined) {
      const implicitDiff = compareImplicitStackItems(a.item, b.item);
      return implicitDiff === 0 ? a.index - b.index : implicitDiff;
    }
    if (aStackOrder === undefined) {
      return -1;
    }
    if (bStackOrder === undefined) {
      return 1;
    }
    const rankDiff = aStackOrder - bStackOrder;
    return rankDiff === 0 ? a.index - b.index : rankDiff;
  });

  return new Map(sorted.map(({ item }, rank) => [item.key, rank]));
}

export function bringCanvasStackOrderItemToFront(
  items: readonly CanvasStackOrderItem[],
  key: string
): BringCanvasStackOrderItemToFrontResult {
  const ranks = resolveCanvasStackOrderRanks(items);
  const currentRank = ranks.get(key);
  if (currentRank === undefined) {
    return { changed: false };
  }
  const topRank = Math.max(...ranks.values());
  if (currentRank === topRank) {
    return { changed: false };
  }

  const maxExplicitRank = items.reduce((max, item) => {
    const stackOrder = finiteInteger(item.stackOrder);
    return stackOrder === undefined ? max : Math.max(max, stackOrder);
  }, -1);

  return { changed: true, stackOrder: maxExplicitRank + 1 };
}

export function normalizeCanvasLayoutStackOrders(
  nodes: readonly CanvasLayoutNode[]
): CanvasLayoutNode[] {
  const explicit = nodes
    .map((node, index) => ({
      index,
      node,
      stackOrder: finiteInteger(node.stackOrder),
    }))
    .filter(
      (
        item
      ): item is {
        index: number;
        node: CanvasLayoutNode;
        stackOrder: number;
      } => item.stackOrder !== undefined
    )
    .sort((a, b) => {
      const rankDiff = a.stackOrder - b.stackOrder;
      return rankDiff === 0 ? a.index - b.index : rankDiff;
    });
  const normalizedByIndex = new Map<number, number>();
  explicit.forEach((item, stackOrder) => {
    normalizedByIndex.set(item.index, stackOrder);
  });

  return nodes.map((node, index) => {
    const stackOrder = normalizedByIndex.get(index);
    if (stackOrder === undefined) {
      const { stackOrder: _ignored, ...rest } = node;
      return rest;
    }
    return { ...node, stackOrder };
  });
}
