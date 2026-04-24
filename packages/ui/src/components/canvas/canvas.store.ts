import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

type ResourceId = string & { readonly __brand: "ResourceId" };
type EdgeId = string & { readonly __brand: "EdgeId" };
type JobId = string & { readonly __brand: "JobId" };
type NodeType = "container" | "database" | "devEnv" | "entry";

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
