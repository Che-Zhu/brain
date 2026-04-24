import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { EdgeId, JobId, NodeType, ResourceId } from "./resource-types";

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export const viewportAtom = atom<ViewportState>({ x: 0, y: 0, zoom: 1 });

export const expandedNodesAtomFamily = atomFamily((_id: ResourceId) =>
  atom(false)
);

export const activeEdgeAtom = atom<EdgeId | null>(null);

export interface GhostNode {
  id: `ghost:${JobId}`;
  jobId: JobId;
  position: { x: number; y: number };
  type: NodeType;
}

export const ghostNodesAtomFamily = atomFamily((_projectId: string) =>
  atom<GhostNode[]>([])
);

export const focusedNodeAtom = atom<{
  id: ResourceId;
  expand?: boolean;
} | null>(null);
