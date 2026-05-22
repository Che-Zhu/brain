import assert from "node:assert/strict";
import { test } from "node:test";

import { CANVAS_ENTRY_NODE_TYPE } from "../nodes/constants";
import { entryPointsToCanvasState } from "./ap-list-to-canvas-state";

test("EntryPoint canvas nodes are derived from AP Network public addresses", () => {
  const state = entryPointsToCanvasState(undefined, {
    apsData: {
      items: [
        {
          metadata: { name: "api", namespace: "default", uid: "ap-uid" },
          spec: {
            input: {
              network: {
                privatePort: 8080,
                publicAddresses: [{ host: "api.example.com", port: 8080 }],
              },
            },
          },
          status: {
            network: {
              privateAddress: "http://api-service.default.svc:8080",
              privatePort: 8080,
              publicAddresses: [
                {
                  host: "api.example.com",
                  port: 8080,
                  status: "accessible",
                  type: "platform",
                  url: "https://api.example.com/",
                },
              ],
            },
          },
        },
        {
          metadata: { name: "worker", namespace: "default", uid: "worker-uid" },
          spec: {
            input: {
              network: {
                privatePort: 9000,
              },
            },
          },
          status: {
            network: {
              privateAddress: "http://worker-service.default.svc:9000",
              privatePort: 9000,
            },
          },
        },
      ],
    },
    namespaceFallback: "default",
  });

  assert.equal(state.nodes.length, 1);
  assert.equal(state.nodes[0]?.id, "entry-api");
  assert.equal(state.nodes[0]?.type, CANVAS_ENTRY_NODE_TYPE);
  assert.deepEqual(state.nodes[0]?.data, {
    accessDomain: {
      label: "Access domain",
      value: "api.example.com",
    },
    resource: {
      apRef: "api",
      name: "api",
      namespace: "default",
    },
    states: { name: "api" },
    targets: [
      {
        id: "8080-api.example.com",
        label: "Platform Address",
        status: { label: "Accessible", tone: "accessible" },
        value: "https://api.example.com/",
      },
    ],
  });
});

test("EntryPoint canvas nodes fall back to desired Public Addresses while observed URLs are pending", () => {
  const state = entryPointsToCanvasState(undefined, {
    apsData: {
      items: [
        {
          metadata: { name: "api", namespace: "default" },
          spec: {
            input: {
              network: {
                privatePort: 8080,
                publicAddresses: [{ host: "api.example.com", port: 8080 }],
              },
            },
          },
          status: {
            network: {
              privateAddress: "http://api-service.default.svc:8080",
              privatePort: 8080,
            },
          },
        },
      ],
    },
    namespaceFallback: "default",
  });

  assert.deepEqual(state.nodes[0]?.data, {
    accessDomain: {
      label: "Access domain",
      value: "api.example.com",
    },
    resource: {
      apRef: "api",
      name: "api",
      namespace: "default",
    },
    states: { name: "api" },
    targets: [
      {
        id: "8080-api.example.com",
        label: "Public Address",
        status: { label: "Unknown", tone: "unknown" },
        value: "https://api.example.com/",
      },
    ],
  });
});

test("EntryPoint canvas nodes keep uid fallback when resource name is unavailable", () => {
  const state = entryPointsToCanvasState(
    {
      items: [
        {
          metadata: { namespace: "default", uid: "entry-uid" },
          spec: {
            apRef: "api",
            targets: [
              {
                platformDomain: "https://api.example.com",
                port: 8080,
                status: "accessible",
              },
            ],
          },
        },
      ],
    },
    { namespaceFallback: "default" }
  );

  assert.equal(state.nodes[0]?.id, "entry-entry-uid");
  assert.deepEqual(state.nodes[0]?.data, {
    accessDomain: {
      label: "Access domain",
      value: "api.example.com",
    },
    resource: {
      apRef: "api",
      name: "unknown",
      namespace: "default",
      uid: "entry-uid",
    },
    states: { name: "unknown" },
    targets: [
      {
        id: "8080-api.example.com",
        label: "Public Domain",
        status: { label: "Accessible", tone: "accessible" },
        value: "https://api.example.com/",
      },
    ],
  });
});
