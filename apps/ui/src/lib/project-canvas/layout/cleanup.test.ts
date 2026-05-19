import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanupCanvasLayoutDocument } from "./cleanup";
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

test("cleanup purges stale orphans and preserves live layout metadata", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "web-uid",
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "young-db", {
        orphanedAt: "2026-05-18T00:00:00.000Z",
        position: { x: 300, y: 400 },
      }),
      layoutNode("EntryPoint", "old-entry", {
        orphanedAt: "2026-05-11T23:59:59.999Z",
        position: { x: 500, y: 600 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  };

  const cleaned = cleanupCanvasLayoutDocument(layout, { now: NOW });

  assert.deepEqual(cleaned, {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "web-uid",
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "young-db", {
        orphanedAt: "2026-05-18T00:00:00.000Z",
        position: { x: 300, y: 400 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  });
  assert.equal(layout.nodes.length, 3);
});
