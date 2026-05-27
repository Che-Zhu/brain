import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultDbAccessCapabilities } from "./capabilities";
import type { DbAccessAdapter } from "./types";

const FORBIDDEN_ADAPTER_METHOD_TERMS = [
  "create",
  "ddl",
  "delete",
  "drop",
  "execute",
  "mutat",
  "query",
  "update",
  "write",
];

test("DB Access Workbench v1 capabilities default to read-only browsing", () => {
  assert.deepEqual(defaultDbAccessCapabilities, {
    assistantLinkage: false,
    bi: false,
    browse: true,
    chart: false,
    dashboard: false,
    ddl: false,
    export: true,
    query: false,
    rows: true,
    write: false,
  });
});

test("DB Access adapter contract exposes no query, write, or DDL methods", () => {
  const adapterMethodNames = [
    "checkHealth",
    "exportObject",
    "getObjectMetadata",
    "listColumns",
    "listObjects",
    "readRows",
  ] satisfies Array<keyof DbAccessAdapter>;

  assert.equal(
    adapterMethodNames.some((methodName) =>
      FORBIDDEN_ADAPTER_METHOD_TERMS.some((term) =>
        methodName.toLowerCase().includes(term)
      )
    ),
    false
  );
});
