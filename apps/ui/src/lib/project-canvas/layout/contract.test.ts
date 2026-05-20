import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCanvasLayoutPatchRequest } from "./contract";

test("patch contract preserves orphan metadata but drops non-layout state", () => {
  const parsed = parseCanvasLayoutPatchRequest({
    namespace: "ns-a",
    nodes: [
      {
        expanded: true,
        lastSeenUid: "uid-a",
        orphanedAt: "2026-05-19T00:00:00.000Z",
        position: { x: 100, y: 200 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-a",
    resourceDisplayName: "Primary Postgres",
    viewport: { x: 1, y: 2, zoom: 0.5 },
  });

  assert.deepEqual(parsed, {
    namespace: "ns-a",
    nodes: [
      {
        expanded: true,
        lastSeenUid: "uid-a",
        orphanedAt: "2026-05-19T00:00:00.000Z",
        position: { x: 100, y: 200 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-a",
  });
});

test("patch contract ignores user-created or connecting edges", () => {
  const parsed = parseCanvasLayoutPatchRequest({
    namespace: "ns-a",
    nodes: [],
    edges: [
      {
        id: "user-created-edge",
        source: "ap-web",
        target: "db-postgres",
      },
      {
        id: "xy-edge__ap-web-db-postgres",
        source: "ap-web",
        sourceHandle: null,
        target: "db-postgres",
        targetHandle: null,
      },
    ],
    projectUid: "project-a",
  });

  assert.deepEqual(parsed, {
    namespace: "ns-a",
    nodes: [],
    projectUid: "project-a",
  });
  assert.equal("edges" in parsed, false);
});
