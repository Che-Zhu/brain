import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDbSettingsPatch,
  DB_SETTINGS_REPLICAS,
  dbSettingsDraftFromNodeData,
  dbSettingsDraftIsDirty,
} from "./database-settings-draft";

test("DB settings draft initializes bounded replicas from desired state", () => {
  assert.deepEqual(DB_SETTINGS_REPLICAS, { max: 10, min: 1 });

  assert.deepEqual(
    dbSettingsDraftFromNodeData({
      desired: { replicas: 12 },
      states: { displayEngine: "PostgreSQL", name: "postgres" },
    }),
    { replicas: 10 }
  );

  assert.deepEqual(
    dbSettingsDraftFromNodeData({
      desired: {},
      states: { displayEngine: "PostgreSQL", name: "postgres" },
    }),
    { replicas: 1 }
  );
});

test("DB settings draft detects replica changes and builds focused patches", () => {
  const data = {
    desired: { replicas: 2 },
    states: { displayEngine: "PostgreSQL", name: "postgres" },
  };
  const original = dbSettingsDraftFromNodeData(data);

  assert.equal(dbSettingsDraftIsDirty(original, { replicas: 2 }), false);
  assert.equal(buildDbSettingsPatch(original, { replicas: 2 }), null);

  assert.equal(dbSettingsDraftIsDirty(original, { replicas: 3 }), true);
  assert.deepEqual(buildDbSettingsPatch(original, { replicas: 3 }), {
    spec: { replicas: 3 },
  });
});
