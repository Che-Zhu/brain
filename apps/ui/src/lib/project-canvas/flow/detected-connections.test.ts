import assert from "node:assert/strict";
import { test } from "node:test";

import {
  detectCanvasConnections,
  detectedCanvasConnectionEdges,
} from "./detected-connections";

test("canvas connections detect AP to DB edges from exact DB DSN env values and de-duplicate each pair", () => {
  const apsData = {
    items: [
      {
        metadata: { name: "api", namespace: "default" },
        spec: {
          input: {
            env: [
              { name: "DATABASE_URL", value: "postgres://private" },
              { name: "DATABASE_PUBLIC_URL", value: "postgres://public" },
              { name: "ALMOST_DATABASE_URL", value: "postgres://private " },
            ],
          },
        },
      },
    ],
  };
  const dbsData = {
    items: [
      {
        metadata: { name: "postgres", namespace: "default" },
        status: {
          connectionStringPrivate: "postgres://private",
          connectionStringPublic: "postgres://public",
        },
      },
    ],
  };

  assert.deepEqual(
    detectCanvasConnections({
      apsData,
      dbsData,
      entryPointsData: undefined,
    }),
    [
      {
        kind: "APToDB",
        source: { kind: "AP", name: "api", namespace: "default" },
        target: { kind: "DB", name: "postgres", namespace: "default" },
      },
    ]
  );
});

test("canvas connection edges include DSN-backed AP to DB connections", () => {
  const apsData = {
    items: [
      {
        metadata: { name: "api", namespace: "default" },
        spec: { input: { env: [{ name: "DATABASE_URL", value: "pg://db" }] } },
      },
    ],
  };
  const dbsData = {
    items: [
      {
        metadata: { name: "postgres", namespace: "default" },
        status: { connectionStringPrivate: "pg://db" },
      },
    ],
  };

  assert.deepEqual(
    detectedCanvasConnectionEdges({
      apsData,
      dbsData,
      entryPointsData: undefined,
      nodes: [
        {
          data: { states: { name: "api", namespace: "default" } },
          id: "ap-api",
          position: { x: 0, y: 0 },
          type: "containerNode",
        },
        {
          data: { workload: { name: "postgres", namespace: "default" } },
          id: "db-postgres",
          position: { x: 0, y: 0 },
          type: "databaseNode",
        },
      ],
    }),
    [
      {
        id: "detected:AP:default:api->DB:default:postgres",
        source: "ap-api",
        target: "db-postgres",
      },
    ]
  );
});
