import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveCanvasEdgeAnchors } from "./canvas.edge-anchors";

test("canvas edge anchors assign source and target handles through the resolver", () => {
  const result = resolveCanvasEdgeAnchors({
    dragging: false,
    edges: [{ id: "edge-1", source: "source", target: "target" }],
    nodes: [
      { data: {}, id: "source", position: { x: 0, y: 0 } },
      { data: {}, id: "target", position: { x: 320, y: 0 } },
    ],
    previousPairs: new Map(),
    resolver: () => ({
      sourceSide: "right",
      targetSide: "left",
    }),
  });

  assert.deepEqual(result.edges, [
    {
      id: "edge-1",
      source: "source",
      sourceHandle: "right",
      target: "target",
      targetHandle: "left",
    },
  ]);
  assert.deepEqual(result.anchorPairs.get("edge-1"), {
    sourceSide: "right",
    targetSide: "left",
  });
});

test("canvas edge anchors skip unresolved edges and clean stale previous pairs", () => {
  const result = resolveCanvasEdgeAnchors({
    dragging: true,
    edges: [{ id: "missing-target", source: "source", target: "missing" }],
    nodes: [{ data: {}, id: "source", position: { x: 0, y: 0 } }],
    previousPairs: new Map([
      [
        "stale",
        {
          sourceSide: "top",
          targetSide: "bottom",
        },
      ],
    ]),
    resolver: () => ({
      sourceSide: "right",
      targetSide: "left",
    }),
  });

  assert.deepEqual(result.edges, []);
  assert.equal(result.anchorPairs.size, 0);
});
