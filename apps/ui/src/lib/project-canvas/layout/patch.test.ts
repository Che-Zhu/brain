import assert from "node:assert/strict";
import { test } from "node:test";

import { applyCanvasLayoutPatch, CanvasLayoutValidationError } from "./patch";
import type { CanvasLayoutDocument } from "./types";

test("project canvas layout patch merges changed positions and preserves unrelated nodes", () => {
  const existing: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 10, y: 20 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      {
        position: { x: 300, y: 400 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-uid-a",
    version: 4,
  };

  const next = applyCanvasLayoutPatch(existing, {
    nodes: [
      {
        position: { x: 44, y: 88 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
    ],
  });

  assert.equal(next.version, 5);
  assert.deepEqual(next.nodes, [
    {
      position: { x: 44, y: 88 },
      ref: { kind: "AP", name: "web", namespace: "ns-a" },
    },
    {
      position: { x: 300, y: 400 },
      ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
    },
  ]);
  assert.deepEqual(existing.nodes[0]?.position, { x: 10, y: 20 });
});

test("project canvas layout patch rejects invalid numeric positions", () => {
  const existing: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [],
    projectUid: "project-uid-a",
    version: 0,
  };

  assert.throws(
    () =>
      applyCanvasLayoutPatch(existing, {
        nodes: [
          {
            position: { x: Number.NaN, y: 88 },
            ref: { kind: "AP", name: "web", namespace: "ns-a" },
          },
        ],
      }),
    CanvasLayoutValidationError
  );
});

test("project canvas layout patch uses last write for the same node", () => {
  const existing: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 10, y: 20 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
    ],
    projectUid: "project-uid-a",
    version: 1,
  };

  const next = applyCanvasLayoutPatch(existing, {
    nodes: [
      {
        position: { x: 30, y: 40 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      {
        position: { x: 50, y: 60 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
    ],
  });

  assert.deepEqual(next.nodes, [
    {
      position: { x: 50, y: 60 },
      ref: { kind: "AP", name: "web", namespace: "ns-a" },
    },
  ]);
});
