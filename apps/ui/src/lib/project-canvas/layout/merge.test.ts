import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "../nodes/constants";
import { mergeCanvasLayoutWithDetectedNodes } from "./merge";
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
        label: "Primary Postgres",
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
        label: "Customer Portal",
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
      label: "Customer Portal",
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
        label: "Customer Portal",
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
        label: "Primary Postgres",
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
    label: "Primary Postgres",
    orphanedAt: "2026-05-18T00:00:00.000Z",
    position: { x: 300, y: 400 },
    ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
  });
});
