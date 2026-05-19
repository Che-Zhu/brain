import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCanvasLayoutPatchRequest } from "./contract";

test("patch contract preserves label and orphan metadata but drops viewport state", () => {
  const parsed = parseCanvasLayoutPatchRequest({
    namespace: "ns-a",
    nodes: [
      {
        label: "Primary Postgres",
        lastSeenUid: "uid-a",
        orphanedAt: "2026-05-19T00:00:00.000Z",
        position: { x: 100, y: 200 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-a",
    viewport: { x: 1, y: 2, zoom: 0.5 },
  });

  assert.deepEqual(parsed, {
    namespace: "ns-a",
    nodes: [
      {
        label: "Primary Postgres",
        lastSeenUid: "uid-a",
        orphanedAt: "2026-05-19T00:00:00.000Z",
        position: { x: 100, y: 200 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-a",
  });
});
