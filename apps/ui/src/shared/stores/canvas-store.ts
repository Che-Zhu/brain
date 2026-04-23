import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { JobId, NodeType, ResourceId } from "@/shared/types/resource";

export interface GhostNode {
  id: `ghost:${JobId}`;
  jobId: JobId;
  position: { x: number; y: number };
  type: NodeType;
}

// Writers: deployment feature + chat tool components (lands with those features).
// Canvas reads via the merged node-set in Canvas.Provider.
export const ghostNodesAtomFamily = atomFamily((_projectId: string) =>
  atom<GhostNode[]>([])
);

// One-shot mailbox (§5.A): chat sets; use-focus-effect consumes and clears.
// Effect hook lands with node work — only the atom declaration ships now.
export const focusedNodeAtom = atom<{
  id: ResourceId;
  expand?: boolean;
} | null>(null);
