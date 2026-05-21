import type { Node } from "@xyflow/react";

export type CanvasViewportFollowKey = number | string;

export interface CanvasViewportFollowState {
  initialized: boolean;
  key: CanvasViewportFollowKey | null;
  knownNodeIds: ReadonlySet<string>;
}

export type CanvasViewportFollowAction =
  | { kind: "fitView"; nodeIds: string[] }
  | { kind: "none" }
  | { kind: "setCenter"; nodeId: string };

export interface ResolveCanvasViewportFollowOptions {
  isFollowTarget: (node: Node) => boolean;
  key: CanvasViewportFollowKey;
  nodes: readonly Node[];
  state: CanvasViewportFollowState;
}

export const initialCanvasViewportFollowState: CanvasViewportFollowState = {
  initialized: false,
  key: null,
  knownNodeIds: new Set<string>(),
};

export function resolveCanvasViewportFollow({
  isFollowTarget,
  key,
  nodes,
  state,
}: ResolveCanvasViewportFollowOptions): {
  action: CanvasViewportFollowAction;
  state: CanvasViewportFollowState;
} {
  const sameScope = state.key === key;
  const initialized = sameScope ? state.initialized : false;
  const knownNodeIds = sameScope ? state.knownNodeIds : new Set<string>();
  const newFollowNodeIds = initialized
    ? nodes
        .filter((node) => !knownNodeIds.has(node.id) && isFollowTarget(node))
        .map((node) => node.id)
    : [];
  const nextState: CanvasViewportFollowState = {
    initialized: true,
    key,
    knownNodeIds: new Set(nodes.map((node) => node.id)),
  };

  if (newFollowNodeIds.length === 1) {
    const nodeId = newFollowNodeIds[0];
    if (nodeId === undefined) {
      return { action: { kind: "none" }, state: nextState };
    }
    return {
      action: { kind: "setCenter", nodeId },
      state: nextState,
    };
  }

  if (newFollowNodeIds.length > 1) {
    return {
      action: { kind: "fitView", nodeIds: newFollowNodeIds },
      state: nextState,
    };
  }

  return { action: { kind: "none" }, state: nextState };
}
