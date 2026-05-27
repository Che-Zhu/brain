import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDbAccessHttpAdapter,
  DbAccessAdapterError,
  normalizeDbAccessAdapterError,
} from "./adapter";

const CONNECTION_SECRET_MESSAGE = "connection secret";

function first<T>(items: T[]): T {
  const item = items[0];
  assert.ok(item);
  return item;
}

test("DB Access adapter checks health through the brainv2 API boundary", async () => {
  const requests: Array<{ body: unknown; headers: Headers; url: string }> = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers,
      url: String(input),
    });
    return Promise.resolve(
      new Response(
        JSON.stringify({
          engine: "postgresql",
          name: "pg-main",
          namespace: "ns-a",
          status: "healthy",
          whoDB: { database: "healthy", server: "healthy" },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };

  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "apiVersion: v1\nclusters: []",
    namespace: "ns-a",
    projectUid: "project-1",
  });

  const health = await adapter.checkHealth();
  const request = first(requests);

  assert.equal(health.status, "healthy");
  assert.equal(
    request.url,
    "https://ui.example/api/db/v1alpha1/pg-main/access/health"
  );
  assert.equal(request.headers.get("Content-Type"), "application/json");
  assert.equal(
    request.headers.get("Authorization"),
    "Bearer apiVersion%3A%20v1%0Aclusters%3A%20%5B%5D"
  );
  assert.deepEqual(request.body, {
    namespace: "ns-a",
    projectUid: "project-1",
  });
  assert.ok(
    !JSON.stringify(requests).includes("password"),
    "browser request must not expose raw DB credentials"
  );
});

test("DB Access adapter lists objects with structured parent and kind filters", async () => {
  const requests: Array<{ body: unknown; url: string }> = [];
  const fetchImpl: typeof fetch = (input, init) => {
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      url: String(input),
    });
    return Promise.resolve(
      new Response(
        JSON.stringify({
          objects: [
            {
              hasChildren: false,
              kind: "table",
              name: "users",
              path: ["postgres", "public", "users"],
              ref: { kind: "table", path: ["postgres", "public", "users"] },
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };
  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "kubeconfig",
    namespace: "ns-a",
    projectUid: "project-1",
  });

  const result = await adapter.listObjects({
    kinds: ["table", "view"],
    parent: { kind: "schema", path: ["postgres", "public"] },
  });
  const request = first(requests);

  assert.equal(first(result.objects).name, "users");
  assert.equal(
    request.url,
    "https://ui.example/api/db/v1alpha1/pg-main/access/objects"
  );
  assert.deepEqual(request.body, {
    kinds: ["table", "view"],
    namespace: "ns-a",
    parent: { kind: "schema", path: ["postgres", "public"] },
    projectUid: "project-1",
  });
});

test("DB Access adapter reads rows with bounded pagination and sort input", async () => {
  const requests: Array<{ body: unknown; url: string }> = [];
  const fetchImpl: typeof fetch = (input, init) => {
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      url: String(input),
    });
    return Promise.resolve(
      new Response(
        JSON.stringify({
          columns: [{ isPrimary: true, name: "id", type: "integer" }],
          pageOffset: 50,
          pageSize: 50,
          ref: { kind: "table", path: ["postgres", "public", "users"] },
          rows: [["1"]],
          totalCount: 101,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };
  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "kubeconfig",
    namespace: "ns-a",
    projectUid: "project-1",
  });

  const result = await adapter.readRows({
    pageOffset: 50,
    pageSize: 50,
    ref: { kind: "table", path: ["postgres", "public", "users"] },
    sort: [{ column: "id", direction: "DESC" }],
  });
  const request = first(requests);

  assert.equal(result.totalCount, 101);
  assert.equal(
    request.url,
    "https://ui.example/api/db/v1alpha1/pg-main/access/rows"
  );
  assert.deepEqual(request.body, {
    namespace: "ns-a",
    pageOffset: 50,
    pageSize: 50,
    projectUid: "project-1",
    ref: { kind: "table", path: ["postgres", "public", "users"] },
    sort: [{ column: "id", direction: "DESC" }],
  });
});

test("DB Access adapter inspects object and column metadata through explicit endpoints", async () => {
  const requests: Array<{ body: unknown; url: string }> = [];
  const fetchImpl: typeof fetch = (input, init) => {
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      url: String(input),
    });
    const operation = String(input).endsWith("/columns") ? "columns" : "object";
    return Promise.resolve(
      new Response(
        JSON.stringify(
          operation === "columns"
            ? {
                columns: [{ name: "email", type: "varchar" }],
                ref: { kind: "table", path: ["postgres", "public", "users"] },
              }
            : {
                object: {
                  hasChildren: false,
                  kind: "table",
                  metadata: { Type: "BASE TABLE" },
                  name: "users",
                  path: ["postgres", "public", "users"],
                  ref: {
                    kind: "table",
                    path: ["postgres", "public", "users"],
                  },
                },
              }
        ),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )
    );
  };
  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "kubeconfig",
    namespace: "ns-a",
    projectUid: "project-1",
  });
  const ref = { kind: "table" as const, path: ["postgres", "public", "users"] };

  const object = await adapter.getObjectMetadata({ ref });
  const columns = await adapter.listColumns({ ref });

  assert.equal(object.object.metadata?.Type, "BASE TABLE");
  assert.equal(first(columns.columns).name, "email");
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "https://ui.example/api/db/v1alpha1/pg-main/access/object",
      "https://ui.example/api/db/v1alpha1/pg-main/access/columns",
    ]
  );
  assert.deepEqual(first(requests).body, {
    namespace: "ns-a",
    projectUid: "project-1",
    ref,
  });
  const columnsRequest = requests[1];
  assert.ok(columnsRequest);
  assert.deepEqual(columnsRequest.body, {
    namespace: "ns-a",
    projectUid: "project-1",
    ref,
  });
});

test("DB Access adapter exports object data through the server-side export endpoint", async () => {
  const requests: Array<{ body: unknown; url: string }> = [];
  const fetchImpl: typeof fetch = (input, init) => {
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      url: String(input),
    });
    return Promise.resolve(
      new Response("id,email\n1,ada@example.com\n", {
        headers: {
          "Content-Disposition": 'attachment; filename="pg-main-users.csv"',
          "Content-Type": "text/csv",
        },
        status: 200,
      })
    );
  };
  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "kubeconfig",
    namespace: "ns-a",
    projectUid: "project-1",
  });
  const ref = { kind: "table" as const, path: ["postgres", "public", "users"] };

  const result = await adapter.exportObject({ format: "csv", ref });
  const request = first(requests);

  assert.equal(await result.blob.text(), "id,email\n1,ada@example.com\n");
  assert.equal(result.contentType, "text/csv");
  assert.equal(
    result.contentDisposition,
    'attachment; filename="pg-main-users.csv"'
  );
  assert.equal(
    request.url,
    "https://ui.example/api/db/v1alpha1/pg-main/access/export"
  );
  assert.deepEqual(request.body, {
    format: "csv",
    namespace: "ns-a",
    projectUid: "project-1",
    ref,
  });
});

test("DB Access adapter normalizes health and readiness failures as recoverable", async () => {
  const fetchImpl: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ detail: "DB connection secret is missing" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 409,
        }
      )
    );
  const adapter = createDbAccessHttpAdapter({
    baseUrl: "https://ui.example",
    dbName: "pg-main",
    fetchImpl,
    kubeconfig: "kubeconfig",
    namespace: "ns-a",
    projectUid: "project-1",
  });

  await assert.rejects(
    () => adapter.checkHealth(),
    (error) => {
      const normalized = normalizeDbAccessAdapterError(error);
      assert.ok(error instanceof DbAccessAdapterError);
      assert.equal(normalized.status, 409);
      assert.equal(normalized.recoverable, true);
      assert.ok(
        normalized.message.toLowerCase().includes(CONNECTION_SECRET_MESSAGE)
      );
      return true;
    }
  );
});
