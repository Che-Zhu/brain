import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createInitialDbAccessWorkbenchState,
  dbAccessWorkbenchReducer,
} from "./store";

function first<T>(items: T[]): T {
  const item = items[0];
  assert.ok(item);
  return item;
}

test("DB Access Workbench store owns tree, tabs, filters, pagination, and export state", () => {
  let state = createInitialDbAccessWorkbenchState();
  const schemaRef = { kind: "schema" as const, path: ["postgres", "public"] };
  const tableRef = {
    kind: "table" as const,
    path: ["postgres", "public", "users"],
  };

  state = dbAccessWorkbenchReducer(state, {
    children: [
      {
        hasChildren: false,
        kind: "table",
        name: "users",
        path: tableRef.path,
        ref: tableRef,
      },
    ],
    nodeId: "schema:postgres/public",
    type: "setTreeChildren",
  });
  state = dbAccessWorkbenchReducer(state, {
    object: {
      hasChildren: false,
      kind: "table",
      name: "users",
      path: tableRef.path,
      ref: tableRef,
    },
    type: "openObjectTab",
  });
  const tabId = state.activeTabId;
  assert.ok(tabId);

  state = dbAccessWorkbenchReducer(state, {
    tabId,
    type: "setFilterText",
    value: "ada",
  });
  state = dbAccessWorkbenchReducer(state, {
    pageOffset: 100,
    pageSize: 50,
    tabId,
    type: "setPagination",
  });
  state = dbAccessWorkbenchReducer(state, {
    exportState: {
      format: "csv",
      ref: tableRef,
      status: "ready",
    },
    type: "setExportState",
  });

  assert.deepEqual(
    first(state.treeData["schema:postgres/public"] ?? []).ref,
    tableRef
  );
  assert.equal(state.tabs.length, 1);
  assert.equal(first(state.tabs).title, "users");
  assert.equal(state.filtersByTab[tabId], "ada");
  assert.deepEqual(state.paginationByTab[tabId], {
    pageOffset: 100,
    pageSize: 50,
  });
  assert.deepEqual(state.exportState, {
    format: "csv",
    ref: tableRef,
    status: "ready",
  });
  assert.equal(
    Object.values(state.treeData).some((children) =>
      children.some((child) => child.ref === schemaRef)
    ),
    false
  );
});

test("DB Access Workbench store reuses an existing object tab", () => {
  let state = createInitialDbAccessWorkbenchState();
  const object = {
    hasChildren: false,
    kind: "view" as const,
    name: "active_users",
    path: ["postgres", "public", "active_users"],
    ref: {
      kind: "view" as const,
      path: ["postgres", "public", "active_users"],
    },
  };

  state = dbAccessWorkbenchReducer(state, { object, type: "openObjectTab" });
  const firstTabId = state.activeTabId;
  state = dbAccessWorkbenchReducer(state, { object, type: "openObjectTab" });

  assert.equal(state.tabs.length, 1);
  assert.equal(state.activeTabId, firstTabId);
});
