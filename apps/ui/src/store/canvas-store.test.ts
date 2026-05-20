import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

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
