import assert from "node:assert/strict";
import { test } from "node:test";

import type { MessageKey } from "@data-browser/i18n/messages";
import {
  getCollectionMenuItems,
  getConnectionMenuItems,
  getDatabaseMenuItems,
  getRedisKeyMenuItems,
  getSchemaMenuItems,
  getTableMenuItems,
  getViewMenuItems,
} from "./contextMenuItems";

const forbiddenActions = new Set([
  "new_query",
  "create_database",
  "new_database",
  "rename_database",
  "delete_database",
  "new_table",
  "rename_table",
  "delete_table",
  "copy_table",
  "clear_table",
  "new_collection",
  "drop_collection",
  "new_redis_key",
  "delete_redis_key",
  "toggle_system_objects",
  "export_database",
]);

function actionsFor(items: ReturnType<typeof getSchemaMenuItems>): string[] {
  const actions: string[] = [];
  for (const item of items) {
    if (item.onClick) {
      item.onClick();
    }
  }
  return actions;
}

function callbacks(actions: string[]) {
  return {
    onAction: (action: string) => actions.push(action),
    t: (key: MessageKey) => key,
  };
}

test("context menus expose only refresh and single-object export actions", () => {
  const menuFactories = [
    () => getConnectionMenuItems("POSTGRES", callbacks(actions)),
    () => getDatabaseMenuItems("POSTGRES", callbacks(actions)),
    () => getSchemaMenuItems(callbacks(actions)),
    () => getTableMenuItems("POSTGRES", callbacks(actions)),
    () => getViewMenuItems(callbacks(actions)),
    () => getCollectionMenuItems(callbacks(actions)),
    () => getRedisKeyMenuItems(callbacks(actions)),
  ];
  const actions: string[] = [];

  for (const factory of menuFactories) {
    actionsFor(factory());
  }

  assert.deepEqual(
    [...new Set(actions)].sort(),
    ["export_collection", "export_data", "export_redis_key", "refresh"].sort()
  );
  assert.equal(
    actions.some((action) => forbiddenActions.has(action)),
    false
  );
});
