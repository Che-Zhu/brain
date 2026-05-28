import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeDataBrowserEngine } from "./engine";

test("normalizes supported Data Browser engine keys", () => {
  assert.equal(normalizeDataBrowserEngine("postgresql"), "POSTGRES");
  assert.equal(normalizeDataBrowserEngine("postgres"), "POSTGRES");
  assert.equal(normalizeDataBrowserEngine("pg"), "POSTGRES");
  assert.equal(normalizeDataBrowserEngine("mysql"), "MYSQL");
  assert.equal(normalizeDataBrowserEngine("mongodb"), "MONGODB");
  assert.equal(normalizeDataBrowserEngine("mongo"), "MONGODB");
  assert.equal(normalizeDataBrowserEngine("redis"), "REDIS");
});

test("normalizes unknown Data Browser engine keys as unsupported", () => {
  assert.equal(normalizeDataBrowserEngine(""), "UNSUPPORTED");
  assert.equal(normalizeDataBrowserEngine("clickhouse"), "UNSUPPORTED");
  assert.equal(normalizeDataBrowserEngine(undefined), "UNSUPPORTED");
});
