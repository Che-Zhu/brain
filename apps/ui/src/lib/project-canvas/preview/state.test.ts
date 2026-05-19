import assert from "node:assert/strict";
import { test } from "node:test";

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";

import type { CanvasLayoutDocument } from "../layout/types";
import { buildPreviewProjectCanvasState } from "./state";

function list(items: unknown[]): K8sGetResponse {
  return { items };
}

test("share preview state applies saved AP, DB, and EntryPoint layout positions", () => {
  const layout: CanvasLayoutDocument = {
    namespace: "ns-a",
    nodes: [
      {
        position: { x: 100, y: 200 },
        ref: { kind: "AP", name: "web", namespace: "ns-a" },
      },
      {
        position: { x: 300, y: 400 },
        ref: { kind: "DB", name: "postgres", namespace: "ns-a" },
      },
      {
        position: { x: 500, y: 600 },
        ref: { kind: "EntryPoint", name: "public-web", namespace: "ns-a" },
      },
    ],
    projectUid: "project-a",
    version: 1,
  };

  const state = buildPreviewProjectCanvasState({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a", uid: "web-uid" },
        spec: { image: "nginx", replicas: 2 },
        status: { phase: "Running" },
      },
    ]),
    canvasLayout: layout,
    canvasLayoutReady: true,
    dbsData: list([
      {
        metadata: { name: "postgres", namespace: "ns-a", uid: "pg-uid" },
        spec: { engine: "postgresql" },
        status: { phase: "Running" },
      },
    ]),
    entryPointsData: list([
      {
        metadata: {
          name: "public-web",
          namespace: "ns-a",
          uid: "entry-uid",
        },
        status: {
          targets: [
            {
              platformDomain: "https://web.example.test",
              port: 80,
              status: "accessible",
            },
          ],
        },
      },
    ]),
    namespace: "ns-a",
  });

  assert.deepEqual(
    state.nodes.map((node) => node.position),
    [
      { x: 100, y: 200 },
      { x: 300, y: 400 },
      { x: 500, y: 600 },
    ]
  );
  assert.deepEqual(
    state.nodes.map((node) => {
      const data = node.data as { states?: { name?: string } };
      return data.states?.name;
    }),
    ["web", "postgres", "public-web"]
  );
  assert.equal(state.selectedEdge, null);
  assert.equal(state.selectedNode, null);
});

test("share preview state renders detected EntryPoint-to-AP connections", () => {
  const state = buildPreviewProjectCanvasState({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a", uid: "web-uid" },
        spec: { image: "nginx", replicas: 2 },
        status: { phase: "Running" },
      },
    ]),
    canvasLayout: undefined,
    canvasLayoutReady: true,
    dbsData: list([]),
    entryPointsData: list([
      {
        metadata: {
          name: "public-web",
          namespace: "ns-a",
          uid: "entry-uid",
        },
        spec: { apRef: "web" },
      },
    ]),
    namespace: "ns-a",
  });

  assert.deepEqual(state.edges, [
    {
      id: "detected:EntryPoint:ns-a:public-web->AP:ns-a:web",
      source: "entry-public-web",
      target: "ap-web",
    },
  ]);
});
