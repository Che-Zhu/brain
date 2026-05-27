import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBrainDbAccessAdapter,
  type DbAccessRequestOptions,
} from "./brain-adapter";

const DATAFLOW_TRANSPORT_RE = /WhoDB|Apollo|DataFlow/i;
const CREDENTIAL_FIELD_RE = /password|credential/i;

test("brain DB Access adapter constructs object listing requests through the API boundary", async () => {
  const calls: DbAccessRequestOptions[] = [];
  const adapter = createBrainDbAccessAdapter({
    dbName: "orders-db",
    kubeconfig: "cluster:secret",
    namespace: "ns-admin",
    projectUid: "project-1",
    request: (options) => {
      calls.push(options);
      return Promise.resolve({ objects: [], truncated: false });
    },
  });

  await adapter.listObjects({
    kinds: ["table", "view"],
    parent: { kind: "schema", path: ["orders", "public"] },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    body: {
      kinds: ["table", "view"],
      namespace: "ns-admin",
      parent: { kind: "schema", path: ["orders", "public"] },
      projectUid: "project-1",
    },
    header: {
      Authorization: "Bearer cluster%3Asecret",
    },
    method: "POST",
    path: "/api/db/v1alpha1/orders-db/access/objects",
  });

  assert.doesNotMatch(JSON.stringify(calls[0]), DATAFLOW_TRANSPORT_RE);
  assert.doesNotMatch(JSON.stringify(calls[0]), CREDENTIAL_FIELD_RE);
});

test("brain DB Access adapter constructs health, metadata, columns, rows, and export requests", async () => {
  const ref = { kind: "table" as const, path: ["orders", "public", "users"] };
  const calls: DbAccessRequestOptions[] = [];
  const adapter = createBrainDbAccessAdapter({
    dbName: "orders-db",
    kubeconfig: "cluster:secret",
    namespace: "ns-admin",
    projectUid: "project-1",
    request: (options) => {
      calls.push(options);
      if (options.path.endsWith("/access/health")) {
        return Promise.resolve({
          engine: "postgresql",
          name: "orders-db",
          namespace: "ns-admin",
          status: "healthy",
          whodb: { database: "healthy", server: "healthy" },
        });
      }
      if (options.path.endsWith("/access/object")) {
        return Promise.resolve({
          object: {
            hasChildren: false,
            kind: "table",
            name: "users",
            ref,
          },
        });
      }
      if (options.path.endsWith("/access/columns")) {
        return Promise.resolve({ columns: [], ref });
      }
      if (options.path.endsWith("/access/rows")) {
        return Promise.resolve({
          columns: [],
          pageOffset: 20,
          pageSize: 20,
          ref,
          rows: [],
          totalCount: 0,
        });
      }
      return Promise.resolve("id,name\n");
    },
  });

  await adapter.checkHealth();
  await adapter.getObject({ ref });
  await adapter.getColumns({ ref });
  await adapter.readRows({
    pageOffset: 20,
    pageSize: 20,
    ref,
    sort: [{ column: "id", direction: "ASC" }],
  });
  await adapter.exportObject({ format: "csv", ref });

  assert.deepEqual(
    calls.map(({ body, method, path }) => ({ body, method, path })),
    [
      {
        body: { namespace: "ns-admin", projectUid: "project-1" },
        method: "POST",
        path: "/api/db/v1alpha1/orders-db/access/health",
      },
      {
        body: { namespace: "ns-admin", projectUid: "project-1", ref },
        method: "POST",
        path: "/api/db/v1alpha1/orders-db/access/object",
      },
      {
        body: { namespace: "ns-admin", projectUid: "project-1", ref },
        method: "POST",
        path: "/api/db/v1alpha1/orders-db/access/columns",
      },
      {
        body: {
          namespace: "ns-admin",
          pageOffset: 20,
          pageSize: 20,
          projectUid: "project-1",
          ref,
          sort: [{ column: "id", direction: "ASC" }],
        },
        method: "POST",
        path: "/api/db/v1alpha1/orders-db/access/rows",
      },
      {
        body: {
          format: "csv",
          namespace: "ns-admin",
          projectUid: "project-1",
          ref,
        },
        method: "POST",
        path: "/api/db/v1alpha1/orders-db/access/export",
      },
    ]
  );
  assert.ok(
    calls.every(
      (call) => call.header?.Authorization === "Bearer cluster%3Asecret"
    )
  );
});
