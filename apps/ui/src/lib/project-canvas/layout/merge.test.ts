import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import { CANVAS_CONTAINER_NODE_TYPE } from "../nodes/constants";
import { mergeCanvasLayoutWithDetectedNodes } from "./merge";
import type { CanvasLayoutDocument } from "./types";

function apNode(name: string): Node {
  return {
    data: {
      states: {
        name,
        namespace: "default",
      },
    },
    id: `ap-${name}`,
    position: { x: 999, y: 999 },
    type: CANVAS_CONTAINER_NODE_TYPE,
  };
}

test("merge places unplaced nodes in memory without adding them to Canvas Layout", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "default",
    nodes: [],
    projectUid: "project-uid",
    version: 1,
  };

  const result = mergeCanvasLayoutWithDetectedNodes({
    layout,
    nodes: [apNode("api")],
  });

  assert.equal(result.changed, false);
  assert.deepEqual(result.layout?.nodes, []);
  assert.deepEqual(result.nodes[0]?.position, { x: 0, y: 0 });
});
