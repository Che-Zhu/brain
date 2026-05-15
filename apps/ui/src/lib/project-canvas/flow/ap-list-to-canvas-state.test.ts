import assert from "node:assert/strict";
import { test } from "node:test";

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import {
  apsToCanvasState,
  entryPointsToCanvasState,
} from "./ap-list-to-canvas-state";

test("public AP and generated EntryPoint appear as workload and entry nodes", () => {
  const apsData = {
    items: [
      {
        metadata: {
          name: "web",
          namespace: "project-a",
          uid: "ap-uid-1",
        },
        spec: {
          image: "nginx:1.27",
        },
        status: {
          phase: "Running",
        },
      },
    ],
  } as unknown as K8sGetResponse;
  const entryPointsData = {
    items: [
      {
        metadata: {
          name: "web",
          namespace: "project-a",
          uid: "entry-uid-1",
        },
        spec: {
          apRef: "web",
          targets: [
            {
              platformDomain: "web.usw.sealos.app",
              port: 80,
              status: "accessible",
            },
          ],
        },
      },
    ],
  } as unknown as K8sGetResponse;

  const apBlock = apsToCanvasState(apsData, {
    namespaceFallback: "project-a",
  });
  const entryPointBlock = entryPointsToCanvasState(entryPointsData, {
    gridIndexOffset: apBlock.nodes.length,
  });
  const nodes = [...apBlock.nodes, ...entryPointBlock.nodes];

  assert.deepEqual(
    nodes.map((node) => ({ id: node.id, type: node.type })),
    [
      { id: "ap-web", type: CANVAS_CONTAINER_NODE_TYPE },
      { id: "entry-web", type: CANVAS_ENTRY_NODE_TYPE },
    ]
  );

  const entryNode = nodes.find((node) => node.id === "entry-web");
  assert.ok(entryNode, "expected generated EntryPoint node");
  assert.deepEqual(entryNode.data, {
    accessDomain: {
      label: "Access domain",
      value: "web.usw.sealos.app",
    },
    states: {
      name: "web",
    },
    targets: [
      {
        id: "80-web.usw.sealos.app",
        label: "Public Domain",
        status: {
          label: "Accessible",
          tone: "accessible",
        },
        value: "https://web.usw.sealos.app/",
      },
    ],
  });
});
