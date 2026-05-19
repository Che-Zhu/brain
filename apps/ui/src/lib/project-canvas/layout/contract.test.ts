import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCanvasLayoutPatchMatchesOwner,
  parseCanvasLayoutPatchRequest,
} from "./contract";

test("project canvas layout patch request trims ownership keys and node refs", () => {
  const parsed = parseCanvasLayoutPatchRequest({
    namespace: " ns-a ",
    nodes: [
      {
        position: { x: 1, y: 2 },
        ref: { kind: "AP", name: " web ", namespace: " ns-a " },
      },
    ],
    projectUid: " project-uid-a ",
  });

  assert.deepEqual(parsed, {
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 1, y: 2 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
    ],
    projectUid: "project-uid-a",
  });
});

test("project canvas layout patch request rejects invalid resource refs", () => {
  assert.throws(() =>
    parseCanvasLayoutPatchRequest({
      namespace: "ns-a",
      nodes: [
        {
          position: { x: 1, y: 2 },
          ref: { kind: "ReactFlowId", name: "web", namespace: "ns-a" },
        },
      ],
      projectUid: "project-uid-a",
    })
  );
});

test("project canvas layout patch request rejects refs outside the layout namespace", () => {
  const parsed = parseCanvasLayoutPatchRequest({
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 1, y: 2 },
        ref: { kind: "AP", name: "web", namespace: "ns-b" },
      },
    ],
    projectUid: "project-uid-a",
  });

  assert.throws(() => assertCanvasLayoutPatchMatchesOwner(parsed));
});
