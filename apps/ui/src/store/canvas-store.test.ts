import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
} from "@/lib/project-canvas/nodes/constants";
import {
  databasePaneModeForNodeClick,
  normalizeDatabasePaneMode,
  shouldClearDatabasePaneMode,
} from "@/lib/project-canvas/panels/database-panel-mode";
import { projectCanvasNodeServiceUid } from "./canvas-store";

test("projectCanvasNodeServiceUid reads EntryPoint resource uid", () => {
  const node = {
    data: {
      resource: {
        name: "web",
        namespace: "default",
        uid: "entrypoint-uid",
      },
    },
    id: "entry-web",
    position: { x: 0, y: 0 },
  } as Node;

  assert.equal(projectCanvasNodeServiceUid(node), "entrypoint-uid");
});

test("database panel mode distinguishes settings and metrics URL values", () => {
  assert.equal(normalizeDatabasePaneMode("settings"), "settings");
  assert.equal(normalizeDatabasePaneMode("metrics"), "metrics");
  assert.equal(normalizeDatabasePaneMode("logs"), null);
});

test("database node selection opens settings mode and non-DB selection clears it", () => {
  assert.equal(
    databasePaneModeForNodeClick({ type: CANVAS_DATABASE_NODE_TYPE }),
    "settings"
  );
  assert.equal(
    databasePaneModeForNodeClick({ type: CANVAS_CONTAINER_NODE_TYPE }),
    null
  );
});

test("database panel mode cleanup handles stale and non-DB selections", () => {
  assert.equal(
    shouldClearDatabasePaneMode({
      databasePane: "settings",
      rawNodeCount: 2,
      selectedNode: null,
      serviceUid: "stale-db-uid",
    }),
    true
  );
  assert.equal(
    shouldClearDatabasePaneMode({
      databasePane: "metrics",
      rawNodeCount: 2,
      selectedNode: { type: CANVAS_CONTAINER_NODE_TYPE },
      serviceUid: "ap-uid",
    }),
    true
  );
  assert.equal(
    shouldClearDatabasePaneMode({
      databasePane: "settings",
      rawNodeCount: 2,
      selectedNode: { type: CANVAS_DATABASE_NODE_TYPE },
      serviceUid: "db-uid",
    }),
    false
  );
});
