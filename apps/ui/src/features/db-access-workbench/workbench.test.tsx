import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DbAccessAdapter } from "./types";
import { DbAccessWorkbench } from "./workbench";

const REQUIRED_WORKBENCH_SLOTS = [
  "db-access-workbench",
  "db-access-sidebar",
  "db-access-object-tree",
  "db-access-tab-bar",
  "db-access-tab-content",
  "db-access-data-toolbar",
  "db-access-data-view",
];

const FORBIDDEN_V1_ENTRANCE_TEXT = [
  "BI",
  "Create Chart",
  "Dashboard",
  "New Query",
  "Run Query",
  "create table",
  "delete row",
  "drop table",
  "update row",
];

const adapter = {
  checkHealth: () =>
    Promise.resolve({
      engine: "postgresql",
      name: "orders-db",
      namespace: "default",
      status: "healthy",
    }),
  exportObject: () =>
    Promise.resolve({
      blob: new Blob([""]),
      contentDisposition: null,
      contentType: "text/csv",
    }),
  getObjectMetadata: ({ ref }) =>
    Promise.resolve({
      object: {
        hasChildren: false,
        kind: ref.kind,
        name: ref.path.at(-1) ?? "",
        path: ref.path,
        ref,
      },
    }),
  listColumns: ({ ref }) => Promise.resolve({ columns: [], ref }),
  listObjects: () => Promise.resolve({ objects: [] }),
  readRows: ({ ref }) =>
    Promise.resolve({
      columns: [],
      pageOffset: 0,
      pageSize: 100,
      ref,
      rows: [],
      totalCount: 0,
    }),
} satisfies DbAccessAdapter;

test("DB Access Workbench renders the DataFlow-derived browsing workspace spine", () => {
  const html = renderToStaticMarkup(
    <DbAccessWorkbench
      adapter={adapter}
      database={{
        displayEngine: "PostgreSQL",
        formattedVersion: "16.4",
        name: "orders-db",
      }}
    />
  );

  for (const slot of REQUIRED_WORKBENCH_SLOTS) {
    assert.ok(html.includes(`data-slot="${slot}"`));
  }
  assert.ok(html.includes("Connections"));
  assert.ok(html.includes("No tabs open"));
  assert.ok(html.includes('aria-label="Find in rows"'));
  assert.ok(html.includes('aria-label="Filter rows"'));
  assert.ok(html.includes('aria-label="Export data"'));
});

test("DB Access Workbench v1 renders no query, dashboard, chart, BI, write, or DDL entrances", () => {
  const html = renderToStaticMarkup(
    <DbAccessWorkbench
      adapter={adapter}
      database={{
        displayEngine: "PostgreSQL",
        name: "orders-db",
      }}
    />
  );

  for (const forbiddenText of FORBIDDEN_V1_ENTRANCE_TEXT) {
    assert.ok(!html.includes(forbiddenText));
  }
});
