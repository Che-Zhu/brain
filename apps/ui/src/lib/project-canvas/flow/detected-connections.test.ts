import assert from "node:assert/strict";
import { test } from "node:test";

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";
import {
  detectCanvasConnections,
  detectedCanvasConnectionEdges,
} from "./detected-connections";

function list(items: unknown[]): K8sGetResponse {
  return { items };
}

interface TestNodeOptions {
  id?: string;
  name?: string;
  namespace?: string;
}

const ORIGIN = { x: 0, y: 0 };

function apNode({
  id = "current-ap-node-id",
  name = "web",
  namespace = "ns-a",
}: TestNodeOptions = {}): Node {
  return {
    data: {
      states: { kind: "AP", name, namespace },
    },
    id,
    position: ORIGIN,
    type: CANVAS_CONTAINER_NODE_TYPE,
  };
}

function dbNode({
  id = "current-db-node-id",
  name = "postgres",
  namespace = "ns-a",
}: TestNodeOptions = {}): Node {
  return {
    data: {
      workload: { name, namespace },
    },
    id,
    position: ORIGIN,
    type: CANVAS_DATABASE_NODE_TYPE,
  };
}

function entryPointNode({
  id = "current-entry-node-id",
  name = "public-web",
  namespace = "ns-a",
}: TestNodeOptions = {}): Node {
  return {
    data: {
      resource: { name, namespace },
    },
    id,
    position: ORIGIN,
    type: CANVAS_ENTRY_NODE_TYPE,
  };
}

test("renders an EntryPoint-to-AP connection when apRef targets an existing AP", () => {
  const nodes: Node[] = [apNode(), entryPointNode()];

  const edges = detectedCanvasConnectionEdges({
    apsData: list([{ metadata: { name: "web", namespace: "ns-a" } }]),
    dbsData: list([]),
    entryPointsData: list([
      {
        metadata: { name: "public-web", namespace: "ns-a" },
        spec: { apRef: "web" },
      },
    ]),
    namespaceFallback: "ns-a",
    nodes,
  });

  assert.deepEqual(edges, [
    {
      id: "detected:EntryPoint:ns-a:public-web->AP:ns-a:web",
      source: "current-entry-node-id",
      target: "current-ap-node-id",
    },
  ]);
});

test("does not render an EntryPoint-to-AP connection when the AP is missing", () => {
  const edges = detectedCanvasConnectionEdges({
    apsData: list([]),
    dbsData: list([]),
    entryPointsData: list([
      {
        metadata: { name: "public-web", namespace: "ns-a" },
        spec: { apRef: "web" },
      },
    ]),
    namespaceFallback: "ns-a",
    nodes: [entryPointNode()],
  });

  assert.deepEqual(edges, []);
});

test("renders an AP-to-DB connection when an AP references the DB connection Secret", () => {
  const edges = detectedCanvasConnectionEdges({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a" },
        spec: {
          env: [
            {
              name: "DATABASE_URL",
              valueFrom: {
                secretKeyRef: { key: "uri", name: "postgres-credentials" },
              },
            },
          ],
        },
      },
    ]),
    dbsData: list([
      {
        metadata: { name: "postgres", namespace: "ns-a" },
        spec: { connectionSecretName: "postgres-credentials" },
      },
    ]),
    entryPointsData: list([]),
    namespaceFallback: "ns-a",
    nodes: [apNode(), dbNode()],
  });

  assert.deepEqual(edges, [
    {
      id: "detected:AP:ns-a:web->DB:ns-a:postgres",
      source: "current-ap-node-id",
      target: "current-db-node-id",
    },
  ]);
});

test("deduplicates detected connections across repeated resource references", () => {
  const edges = detectedCanvasConnectionEdges({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a" },
        spec: {
          env: [
            {
              name: "DATABASE_URL",
              valueFrom: {
                secretKeyRef: { key: "uri", name: "postgres-credentials" },
              },
            },
            {
              name: "PGHOST",
              valueFrom: {
                secretKeyRef: { key: "host", name: "postgres-credentials" },
              },
            },
          ],
        },
      },
    ]),
    dbsData: list([
      {
        metadata: { name: "postgres", namespace: "ns-a" },
        spec: { connectionSecretName: "postgres-credentials" },
      },
    ]),
    entryPointsData: list([]),
    namespaceFallback: "ns-a",
    nodes: [apNode(), dbNode()],
  });

  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0], {
    id: "detected:AP:ns-a:web->DB:ns-a:postgres",
    source: "current-ap-node-id",
    target: "current-db-node-id",
  });
});

test("does not create AP-to-DB connections from ambiguous text env values", () => {
  const edges = detectedCanvasConnectionEdges({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a" },
        spec: {
          env: [
            {
              name: "DATABASE_URL",
              value: "postgresql://user:pass@postgres.ns-a.svc:5432/app",
            },
            { name: "DATABASE_NAME", value: "postgres" },
          ],
        },
      },
    ]),
    dbsData: list([
      {
        metadata: { name: "postgres", namespace: "ns-a" },
        spec: { connectionSecretName: "postgres-credentials" },
      },
    ]),
    entryPointsData: list([]),
    namespaceFallback: "ns-a",
    nodes: [apNode(), dbNode()],
  });

  assert.deepEqual(edges, []);
});

test("does not render a detected connection when a current endpoint node is missing", () => {
  const edges = detectedCanvasConnectionEdges({
    apsData: list([
      {
        metadata: { name: "web", namespace: "ns-a" },
        spec: {
          env: [
            {
              name: "DATABASE_URL",
              valueFrom: {
                secretKeyRef: { key: "uri", name: "postgres-credentials" },
              },
            },
          ],
        },
      },
    ]),
    dbsData: list([
      {
        metadata: { name: "postgres", namespace: "ns-a" },
        spec: { connectionSecretName: "postgres-credentials" },
      },
    ]),
    entryPointsData: list([]),
    namespaceFallback: "ns-a",
    nodes: [apNode()],
  });

  assert.deepEqual(edges, []);
});

test("detects connections by stable resource reference before resolving node IDs", () => {
  const connections = detectCanvasConnections({
    apsData: list([{ metadata: { name: "web", namespace: "ns-a" } }]),
    dbsData: list([]),
    entryPointsData: list([
      {
        metadata: { name: "public-web", namespace: "ns-a" },
        spec: { apRef: "web" },
      },
    ]),
    namespaceFallback: "ns-a",
  });

  assert.deepEqual(connections, [
    {
      kind: "EntryPointToAP",
      source: { kind: "EntryPoint", name: "public-web", namespace: "ns-a" },
      target: { kind: "AP", name: "web", namespace: "ns-a" },
    },
  ]);
});
