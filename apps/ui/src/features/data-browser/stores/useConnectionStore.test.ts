import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import type { DataBrowserHostContext } from "@data-browser/api/access-types";
import { useConnectionStore } from "./useConnectionStore";

const runtime = {
  database: {
    displayEngine: "PostgreSQL",
    formattedVersion: "16.4",
    name: "orders-db",
  },
  databaseWorkloadName: "orders-db-claim",
  databaseWorkloadNamespace: "database-system",
  engine: "POSTGRES",
  kubeconfig: "kube",
  namespace: "project-ns",
  projectUid: "project-uid",
} satisfies DataBrowserHostContext;

beforeEach(() => {
  useConnectionStore.setState({
    connections: [],
    selectedItem: null,
  });
});

test("engine-supported runtime initializes a single virtual connection", async () => {
  useConnectionStore.getState().initializeRuntimeConnection(runtime);

  const state = useConnectionStore.getState();
  assert.equal(state.connections.length, 1);
  assert.equal(state.connections[0]?.id, "data-browser-runtime");
  assert.equal(state.connections[0]?.type, "POSTGRES");
  assert.equal(state.connections[0]?.database, "orders-db");
  assert.deepEqual(state.connections[0]?.runtime, runtime);
  assert.deepEqual(await state.fetchDatabases("data-browser-runtime"), [
    "orders-db",
  ]);
});

test("runtime connection initialization is idempotent for the same runtime", () => {
  useConnectionStore.getState().initializeRuntimeConnection(runtime);
  const firstConnection = useConnectionStore.getState().connections[0];

  useConnectionStore.getState().initializeRuntimeConnection({ ...runtime });
  const state = useConnectionStore.getState();

  assert.equal(state.connections.length, 1);
  assert.equal(state.connections[0], firstConnection);
});

test("runtime connection exposes read-only mutation stubs", async () => {
  const result = await useConnectionStore.getState().createDatabase("next");

  assert.equal(result.success, false);
  assert.match(result.message ?? "", /read-only/i);
});
