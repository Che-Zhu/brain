import assert from "node:assert/strict";
import { test } from "node:test";

import { createCanvasLayoutNodePositionSaveScheduler } from "./scheduler";
import type { CanvasLayoutNode } from "./types";

test("project canvas layout scheduler debounces changed node saves", async () => {
  const saves: CanvasLayoutNode[][] = [];
  let scheduled: (() => void) | undefined;
  const scheduler = createCanvasLayoutNodePositionSaveScheduler({
    clearTimeout: () => {
      scheduled = undefined;
    },
    delayMs: 250,
    save: (nodes) => {
      saves.push(nodes);
      return Promise.resolve();
    },
    setTimeout: (callback) => {
      scheduled = callback;
      return 1;
    },
  });

  scheduler.schedule({
    position: { x: 10, y: 20 },
    ref: { kind: "AP", name: "web", namespace: "ns-a" },
  });
  scheduler.schedule({
    position: { x: 30, y: 40 },
    ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
  });

  assert.equal(saves.length, 0);
  await scheduled?.();

  assert.deepEqual(saves, [
    [
      {
        position: { x: 10, y: 20 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      {
        position: { x: 30, y: 40 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
  ]);
});
