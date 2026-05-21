import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPreviewProjectCanvasState } from "./state";

test("preview canvas state renders DSN-backed AP to DB connections from resource state", () => {
  const state = buildPreviewProjectCanvasState({
    apsData: {
      items: [
        {
          metadata: { name: "api", namespace: "default", uid: "ap-uid" },
          spec: {
            input: {
              env: [{ name: "DATABASE_URL", value: "postgres://private" }],
              image: "ghcr.io/acme/api:latest",
            },
          },
        },
      ],
    },
    canvasLayout: undefined,
    dbsData: {
      items: [
        {
          metadata: { name: "postgres", namespace: "default", uid: "db-uid" },
          status: { connectionStringPrivate: "postgres://private" },
        },
      ],
    },
    entryPointsData: undefined,
    namespace: "default",
  });

  assert.deepEqual(state.edges, [
    {
      id: "detected:AP:default:api->DB:default:postgres",
      source: "ap-api",
      target: "db-postgres",
    },
  ]);
  assert.equal(
    state.nodes.some((node) => "actions" in node.data),
    false
  );
});

test("preview canvas state does not render AP to DB connections without exact resource evidence", () => {
  const state = buildPreviewProjectCanvasState({
    apsData: {
      items: [
        {
          metadata: { name: "api", namespace: "default", uid: "ap-uid" },
          spec: {
            input: {
              env: [{ name: "DATABASE_URL", value: "postgres://stale" }],
              image: "ghcr.io/acme/api:latest",
            },
          },
        },
      ],
    },
    canvasLayout: undefined,
    dbsData: {
      items: [
        {
          metadata: { name: "postgres", namespace: "default", uid: "db-uid" },
          status: { connectionStringPrivate: "postgres://private" },
        },
      ],
    },
    entryPointsData: undefined,
    namespace: "default",
  });

  assert.deepEqual(state.edges, []);
});

test("preview canvas state places unplaced EntryPoints to the left of their AP", () => {
  const state = buildPreviewProjectCanvasState({
    apsData: {
      items: [
        {
          metadata: { name: "api", namespace: "default", uid: "ap-uid" },
          spec: { input: { image: "ghcr.io/acme/api:latest" } },
        },
      ],
    },
    canvasLayout: undefined,
    dbsData: undefined,
    entryPointsData: {
      items: [
        {
          metadata: {
            name: "api-entry",
            namespace: "default",
            uid: "entry-uid",
          },
          spec: { apRef: "api" },
        },
      ],
    },
    namespace: "default",
  });

  const positions = new Map(
    state.nodes.map((node) => [node.id, node.position])
  );

  assert.deepEqual(positions.get("ap-api"), { x: 0, y: 0 });
  assert.deepEqual(positions.get("entry-api-entry"), { x: -340, y: 0 });
});
