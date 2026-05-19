import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  fetchProjectCanvasLayout,
  patchProjectCanvasLayoutNodes,
} from "./client";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

test("share preview layout reads include the share token", async () => {
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  globalThis.window = {
    location: { origin: "https://ui.example.test" },
  } as Window & typeof globalThis;
  globalThis.fetch = (input, init) => {
    calls.push({ input, init });
    return Promise.resolve(
      new Response(
        JSON.stringify({
          namespace: "ns-a",
          nodes: [],
          projectUid: "project-a",
          version: 0,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };

  await fetchProjectCanvasLayout({
    namespace: "ns-a",
    projectUid: "project-a",
    shareToken: " share-token ",
  });

  assert.equal(calls.length, 1);
  const url = new URL(String(calls[0]?.input));
  assert.equal(url.searchParams.get("namespace"), "ns-a");
  assert.equal(url.searchParams.get("projectUid"), "project-a");
  assert.equal(url.searchParams.get("shareToken"), "share-token");
  assert.equal(calls[0]?.init?.method, "GET");
});

test("layout mutations do not send share preview tokens", async () => {
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  globalThis.fetch = (input, init) => {
    calls.push({ input, init });
    return Promise.resolve(
      new Response(
        JSON.stringify({
          namespace: "ns-a",
          nodes: [],
          projectUid: "project-a",
          version: 1,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };

  await patchProjectCanvasLayoutNodes({
    namespace: "ns-a",
    nodes: [],
    projectUid: "project-a",
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), "/api/project-canvas/layout");
  assert.equal(calls[0]?.init?.method, "PATCH");
  assert.equal(JSON.parse(String(calls[0]?.init?.body)).shareToken, undefined);
});
