import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DbAccessWorkbench } from "./db-access-workbench";

const WORKBENCH_LABEL_RE = /aria-label="DB Access Workbench"/;
const DATABASE_NAME_RE = /orders-db/;
const DATABASE_VERSION_RE = /PostgreSQL 16.4/;
const ERROR_TITLE_RE = /Connection secret missing/;
const ERROR_MESSAGE_RE = /The database connection secret is not available yet/;
const RETRY_BUTTON_RE = />Retry</;

test("DB Access Workbench renders recoverable surface health states with canvas context", () => {
  const html = renderToStaticMarkup(
    <DbAccessWorkbench
      context={{
        databaseName: "orders-db",
        engine: "PostgreSQL",
        namespace: "ns-admin",
        version: "16.4",
      }}
      surfaceState={{
        code: "missing-secret",
        message: "The database connection secret is not available yet.",
        retryable: true,
        title: "Connection secret missing",
      }}
    />
  );

  assert.match(html, WORKBENCH_LABEL_RE);
  assert.match(html, DATABASE_NAME_RE);
  assert.match(html, DATABASE_VERSION_RE);
  assert.match(html, ERROR_TITLE_RE);
  assert.match(html, ERROR_MESSAGE_RE);
  assert.match(html, RETRY_BUTTON_RE);
});
