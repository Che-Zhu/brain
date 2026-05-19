import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import {
  canvasLayoutResourceRefFromNode,
  mergeCanvasLayoutWithDetectedNodes,
} from "./merge";
import type {
  CanvasLayoutDocument,
  CanvasLayoutNode,
  CanvasLayoutResourceKind,
} from "./types";

const NOW = new Date("2026-05-19T00:00:00.000Z");
const OLDER_THAN_SEVEN_DAYS = "2026-05-11T23:59:59.999Z";

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

function apNode(name: string, position = { x: 0, y: 0 }): Node {
  return {
    data: { states: { name, namespace: "ns-a", uid: `${name}-uid` } },
    id: `ap-${name}`,
    position,
    type: CANVAS_CONTAINER_NODE_TYPE,
  };
}

function dbNode(name: string, position = { x: 0, y: 0 }): Node {
  return {
    data: {
      states: { displayEngine: "PostgreSQL", name },
      uid: `${name}-uid`,
      workload: { name, namespace: "ns-a" },
    },
    id: `db-${name}`,
    position,
    type: CANVAS_DATABASE_NODE_TYPE,
  };
}

function entryNode(name: string, position = { x: 0, y: 0 }): Node {
  return {
    data: {
      resource: { name, namespace: "ns-a", uid: `${name}-uid` },
      states: { name },
      targets: [],
    },
    id: `entry-${name}`,
    position,
    type: CANVAS_ENTRY_NODE_TYPE,
  };
}

test("applies saved positions without changing resource identity", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "postgres", {
        position: { x: 300, y: 400 },
      }),
      layoutNode("EntryPoint", "public-web", {
        position: { x: 500, y: 600 },
      }),
    ],
    projectUid: "project-a",
    version: 1,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web"), dbNode("postgres"), entryNode("public-web")],
    now: NOW,
  });

  assert.deepEqual(
    result.nodes.map((node) => node.position),
    [
      { x: 100, y: 200 },
      { x: 300, y: 400 },
      { x: 500, y: 600 },
    ]
  );
  assert.deepEqual(
    result.nodes.map((node) => {
      const data = node.data as { states?: { name?: string } };
      return data.states?.name;
    }),
    ["web", "postgres", "public-web"]
  );
  assert.deepEqual(
    result.nodes.map((node) => canvasLayoutResourceRefFromNode(node)),
    [
      { kind: "AP", name: "web", namespace: "ns-a" },
      { kind: "DB", name: "postgres", namespace: "ns-a" },
      { kind: "EntryPoint", name: "public-web", namespace: "ns-a" },
    ]
  );
});

test("marks layout items missing from the detected graph as hidden orphans", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", { position: { x: 100, y: 200 } }),
      layoutNode("DB", "postgres", {
        lastSeenUid: "postgres-old-uid",
        position: { x: 300, y: 400 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web")],
    now: NOW,
  });

  assert.deepEqual(
    result.nodes.map((node) => node.id),
    ["ap-web"]
  );
  assert.deepEqual(result.nodes[0]?.position, { x: 100, y: 200 });
  assert.equal(result.changed, true);
  assert.deepEqual(result.layout, {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "web-uid",
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "postgres", {
        lastSeenUid: "postgres-old-uid",
        orphanedAt: NOW.toISOString(),
        position: { x: 300, y: 400 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  });
  assert.equal(layout.nodes[1]?.orphanedAt, undefined);
});

test("does not treat Kubernetes UID as the layout key", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("DB", "postgres", {
        lastSeenUid: "old-uid",
        position: { x: 300, y: 400 },
      }),
    ],
    projectUid: "project-a",
    version: 1,
  };
  const dbWithNewUid: Node = {
    data: {
      uid: "new-uid",
      workload: { name: "postgres", namespace: "ns-a" },
    },
    id: "db-postgres-recreated",
    position: { x: 0, y: 0 },
    type: CANVAS_DATABASE_NODE_TYPE,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [dbWithNewUid],
    now: NOW,
  });

  assert.deepEqual(result.nodes[0]?.position, { x: 300, y: 400 });
  assert.equal(result.layout?.nodes[0]?.lastSeenUid, "new-uid");
});

test("purges orphan layout items once they are older than seven days", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", { position: { x: 100, y: 200 } }),
      layoutNode("DB", "postgres", {
        orphanedAt: OLDER_THAN_SEVEN_DAYS,
        position: { x: 300, y: 400 },
      }),
    ],
    projectNameSnapshot: "Project A",
    projectUid: "project-a",
    version: 4,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web")],
    now: NOW,
  });

  assert.deepEqual(result.layout?.nodes, [
    layoutNode("AP", "web", {
      lastSeenUid: "web-uid",
      position: { x: 100, y: 200 },
    }),
  ]);
});

test("clears orphan state when a resource reappears with the same stable reference", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "old-uid",
        orphanedAt: "2026-05-18T00:00:00.000Z",
        position: { x: 100, y: 200 },
      }),
    ],
    projectUid: "project-a",
    version: 4,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web", { x: 900, y: 900 })],
    now: NOW,
  });

  assert.deepEqual(result.nodes[0]?.position, { x: 100, y: 200 });
  assert.deepEqual(result.layout?.nodes, [
    layoutNode("AP", "web", {
      lastSeenUid: "web-uid",
      position: { x: 100, y: 200 },
    }),
  ]);
});

test("does not restore stale orphan layout when a resource reappears after retention", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "old-uid",
        orphanedAt: OLDER_THAN_SEVEN_DAYS,
        position: { x: 100, y: 200 },
      }),
    ],
    projectUid: "project-a",
    version: 4,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web", { x: 900, y: 900 })],
    now: NOW,
  });

  assert.deepEqual(result.nodes[0]?.position, { x: 900, y: 900 });
  assert.deepEqual(result.layout?.nodes, []);
});

test("retains young orphan layout items and settles repeated merges", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      layoutNode("AP", "web", {
        lastSeenUid: "web-uid",
        position: { x: 100, y: 200 },
      }),
      layoutNode("DB", "postgres", {
        orphanedAt: "2026-05-18T00:00:00.000Z",
        position: { x: 300, y: 400 },
      }),
    ],
    projectUid: "project-a",
    version: 4,
  };

  const first = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("web")],
    now: NOW,
  });
  const second = mergeCanvasLayoutWithDetectedNodes({
    layout: first.layout,
    nodes: [apNode("web")],
    now: NOW,
  });

  assert.equal(first.changed, false);
  assert.equal(second.changed, false);
  assert.deepEqual(second.layout, first.layout);
  assert.deepEqual(layout.nodes[1], {
    orphanedAt: "2026-05-18T00:00:00.000Z",
    position: { x: 300, y: 400 },
    ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
  });
});
