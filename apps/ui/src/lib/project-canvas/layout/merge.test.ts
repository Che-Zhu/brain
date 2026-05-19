import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import { CANVAS_CONTAINER_NODE_TYPE } from "../nodes/constants";
import { applyCanvasLayoutToNodes } from "./merge";
import type { CanvasLayoutDocument } from "./types";

test("project canvas layout applies saved positions by stable resource reference", () => {
  const detectedNodes: Node[] = [
    {
      data: {
        states: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      id: "ap-react-flow-id-can-change",
      position: { x: 0, y: 0 },
      type: CANVAS_CONTAINER_NODE_TYPE,
    },
    {
      data: {
        states: { kind: "AP", name: "worker", namespace: "ns-a" },
      },
      id: "ap-worker",
      position: { x: 340, y: 0 },
      type: CANVAS_CONTAINER_NODE_TYPE,
    },
  ];
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 80, y: 160 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      {
        position: { x: 999, y: 999 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
    ],
    projectUid: "project-uid-a",
    version: 7,
  };

  const merged = applyCanvasLayoutToNodes(detectedNodes, layout);

  assert.deepEqual(
    merged.nodes.map((node) => node.position),
    [
      { x: 80, y: 160 },
      { x: 340, y: 0 },
    ]
  );
  assert.deepEqual(detectedNodes[0]?.position, { x: 0, y: 0 });
});
