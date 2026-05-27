import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultDbAccessCapabilities } from "./capabilities";

test("default DB Access capabilities expose only V1 read and export behavior", () => {
  assert.deepEqual(defaultDbAccessCapabilities, {
    assistant: false,
    browse: true,
    dashboard: false,
    export: true,
    query: false,
    rows: true,
    write: false,
  });
});
