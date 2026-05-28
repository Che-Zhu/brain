import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import type { AccessObjectRef } from "@data-browser/api/access-types";
import { objectTabId, useTabStore } from "@data-browser/stores/useTabStore";
import { renderToStaticMarkup } from "react-dom/server";
import { MainLayout } from "./MainLayout";

const tableRef = {
  kind: "table",
  path: ["orders", "public", "users"],
} satisfies AccessObjectRef;

afterEach(() => {
  const initialState = useTabStore.getInitialState();
  initialState.activeTabId = null;
  initialState.tabs = [];
  useTabStore.setState({ activeTabId: null, tabs: [] });
});

test("layout provides tooltip context for tab controls", () => {
  const tabId = objectTabId(tableRef);
  const stateWithOpenTab = {
    activeTabId: null,
    tabs: [
      {
        connectionId: "data-browser-runtime",
        databaseName: "orders",
        id: tabId,
        objectRef: tableRef,
        schemaName: "public",
        tableName: "users",
        title: "orders.users",
        type: "table",
      },
    ],
  };
  Object.assign(useTabStore.getInitialState(), stateWithOpenTab);
  useTabStore.setState(stateWithOpenTab);

  let html = "";
  assert.doesNotThrow(() => {
    html = renderToStaticMarkup(<MainLayout />);
  });
  assert.match(html, /data-testid="layout\.tab\.close-button"/);
});
