import assert from "node:assert/strict";
import { test } from "node:test";

import { API_ROUTES } from "../constants";
import { buildAPWorkloadEventsRequest } from "./use-ap-workload-events";

test("AP workload events request uses AP name as product-level target", () => {
  const got = buildAPWorkloadEventsRequest({
    kubeconfig: "apiVersion: v1\nclusters: []",
    limit: 25,
    target: { name: "orders-api", namespace: "project-a" },
  });

  assert.equal(got.method, "GET");
  assert.equal(got.path, API_ROUTES.ap.events);
  assert.deepEqual(got.query, {
    limit: 25,
    name: "orders-api",
    namespace: "project-a",
  });
  assert.deepEqual(got.header, {
    Authorization: "Bearer apiVersion%3A%20v1%0Aclusters%3A%20%5B%5D",
  });
});
