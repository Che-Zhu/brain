import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeDbAccessHealthError } from "./health";

test("DB Access health errors normalize to recoverable surface states", () => {
  assert.deepEqual(
    normalizeDbAccessHealthError(new Error("API 422: unsupported DB engine")),
    {
      code: "unsupported-engine",
      message: "This database engine is not supported by DB Access yet.",
      retryable: false,
      title: "Unsupported database engine",
    }
  );
  assert.deepEqual(
    normalizeDbAccessHealthError(
      new Error("API 409: DB connection secret is missing")
    ),
    {
      code: "missing-secret",
      message: "The database connection secret is not available yet.",
      retryable: true,
      title: "Connection secret missing",
    }
  );
  assert.deepEqual(
    normalizeDbAccessHealthError(new Error("API 503: WhoDB is unavailable")),
    {
      code: "whodb-unavailable",
      message: "The DB Access backend is unavailable right now.",
      retryable: true,
      title: "DB Access unavailable",
    }
  );
  assert.deepEqual(
    normalizeDbAccessHealthError(
      new Error("API 403: DB does not belong to project")
    ),
    {
      code: "ownership",
      message: "This database does not belong to the current Project.",
      retryable: false,
      title: "Project ownership mismatch",
    }
  );
});
