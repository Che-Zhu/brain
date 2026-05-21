import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import { mergeNodes } from "./canvas.node-merge";

function generatedNode(
  id: string,
  position: Node["position"],
  generatedPosition = position
): Node {
  return {
    data: {
      layout: {
        generatedPosition,
        positionSource: "generated",
      },
    },
    id,
    position,
  };
}

test("mergeNodes updates an untouched generated node to its latest generated position", () => {
  const [node] = mergeNodes(
    [generatedNode("entry-api", { x: 0, y: 0 })],
    [generatedNode("entry-api", { x: -340, y: 0 })]
  );

  assert.deepEqual(node?.position, { x: -340, y: 0 });
});

test("mergeNodes preserves a generated node after the user has moved it", () => {
  const [node] = mergeNodes(
    [generatedNode("entry-api", { x: 24, y: 32 }, { x: 0, y: 0 })],
    [generatedNode("entry-api", { x: -340, y: 0 })]
  );

  assert.deepEqual(node?.position, { x: 24, y: 32 });
});
