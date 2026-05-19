import assert from "node:assert/strict";
import { test } from "node:test";

import { applyCanvasLayoutPatch } from "./patch";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutResourceKind,
} from "./types";

const NOW = new Date("2026-05-19T00:00:00.000Z");

function layoutNode(
  kind: CanvasLayoutResourceKind,
  name: string,
  options?: Partial<CanvasLayoutNode>
): CanvasLayoutNode {
  return {
    position: { x: 10, y: 20 },
    ref: { kind, name, namespace: "ns-a" },
    ...options,
  };
}

test("patch save purges stale orphans while preserving version and owner metadata", () => {
  const existing: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "postgres", {
        orphanedAt: "2026-05-11T23:59:59.999Z",
        position: { x: 300, y: 400 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  };

  const next = applyCanvasLayoutPatch(
    existing,
    {
      nodes: [
        layoutNode("AP", "web", {
          position: { x: 120, y: 220 },
        }),
      ],
    },
    { now: NOW }
  );

  assert.deepEqual(next, {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        position: { x: 120, y: 220 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 5,
  });
  assert.equal(existing.nodes.length, 2);
});
