import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addContainerEnvRow,
  deleteContainerEnvRow,
  updateContainerEnvRow,
  validateContainerEnvRows,
} from "./container-env-rows";

test("container env rows add, edit, and delete direct value rows", () => {
  const added = addContainerEnvRow([]);
  assert.deepEqual(added, [{ name: "NEW_VARIABLE", value: "" }]);

  const edited = updateContainerEnvRow(added, 0, {
    name: "DATABASE_URL",
    value: "postgres://db:5432/app",
  });
  assert.deepEqual(edited, [
    { name: "DATABASE_URL", value: "postgres://db:5432/app" },
  ]);

  assert.deepEqual(deleteContainerEnvRow(edited, 0), []);
});

test("container env rows reject duplicate names", () => {
  const result = validateContainerEnvRows([
    { name: "DATABASE_URL", value: "postgres://primary" },
    { name: "DATABASE_URL", value: "postgres://replica" },
  ]);

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    {
      index: 1,
      message: "Environment variable names must be unique.",
      type: "duplicate-name",
    },
  ]);
});
