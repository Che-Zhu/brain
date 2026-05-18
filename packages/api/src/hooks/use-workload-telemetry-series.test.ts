import assert from "node:assert/strict";
import { test } from "node:test";

import { API_ROUTES } from "../constants";
import { buildWorkloadTelemetrySeriesRequest } from "./use-workload-telemetry-series";

test("workload telemetry series request uses one target with top-level sampling window", () => {
  const start = new Date("2026-05-18T00:00:00.000Z");
  const end = new Date("2026-05-18T01:00:00.000Z");
  const target = { kind: "db" as const, name: "pg", namespace: "project-a" };

  const got = buildWorkloadTelemetrySeriesRequest({
    end,
    kubeconfig: "apiVersion: v1\nclusters: []",
    start,
    stepSeconds: 60,
    target,
  });

  assert.equal(got.method, "POST");
  assert.equal(got.path, API_ROUTES.telemetry.metricsSeries);
  assert.deepEqual(got.body, {
    end: "2026-05-18T01:00:00.000Z",
    start: "2026-05-18T00:00:00.000Z",
    step: "60s",
    target,
  });
  assert.deepEqual(got.header, {
    Authorization: "Bearer apiVersion%3A%20v1%0Aclusters%3A%20%5B%5D",
  });
});
