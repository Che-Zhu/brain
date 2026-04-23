import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { EdgeId, ResourceId } from "@/shared/types/resource";

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// Last-known viewport snapshot (updated on discrete events). Per-frame state is
// owned by xyflow — this atom exists for imperative reads and persistence (§5.A).
export const viewportAtom = atom<ViewportState>({ x: 0, y: 0, zoom: 1 });

// Per-node expanded flag; each id gets its own atom so opening one card never
// re-renders the others (§5.A rendering discipline).
export const expandedNodesAtomFamily = atomFamily((_id: ResourceId) =>
  atom(false)
);

// Single ephemeral active-edge marker — covers pointer / touch / keyboard focus
// through one source (§5.A state table).
export const activeEdgeAtom = atom<EdgeId | null>(null);
