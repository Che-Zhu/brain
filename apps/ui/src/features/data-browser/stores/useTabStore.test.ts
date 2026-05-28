import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import type { AccessObjectRef } from "@data-browser/api/access-types";
import { objectTabId, useTabStore } from "./useTabStore";

const tableRef = {
  kind: "table",
  path: ["app", "public", "users"],
} satisfies AccessObjectRef;

beforeEach(() => {
  useTabStore.setState({
    activeTabId: null,
    tabs: [],
  });
});

test("object tabs dedupe by AccessObjectRef canonical identity", () => {
  const firstId = useTabStore.getState().openTab({
    connectionId: "data-browser-runtime",
    databaseName: "app",
    objectRef: tableRef,
    schemaName: "public",
    tableName: "users",
    title: "users",
    type: "table",
  });
  const secondId = useTabStore.getState().openTab({
    connectionId: "data-browser-runtime",
    databaseName: "app",
    objectRef: tableRef,
    schemaName: "public",
    tableName: "users",
    title: "Users Display Name",
    type: "table",
  });

  assert.equal(firstId, objectTabId(tableRef));
  assert.equal(secondId, firstId);
  assert.equal(useTabStore.getState().tabs.length, 1);
});

test("query tab opening is gated off", () => {
  const id = useTabStore.getState().openTab({
    connectionId: "data-browser-runtime",
    title: "Query",
    type: "query",
  });

  assert.equal(id, "");
  assert.equal(useTabStore.getState().tabs.length, 0);
});
