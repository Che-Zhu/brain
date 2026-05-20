import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addContainerEnvDbDsnReferenceRow,
  addContainerEnvRow,
  containerEnvDbDsnFieldOptions,
  containerEnvDbDsnReferenceFromValue,
  containerEnvRowsEqual,
  deleteContainerEnvRow,
  normalizeContainerEnvRowsForSave,
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

test("container env rows normalize direct rows and compare by saved shape", () => {
  assert.deepEqual(
    normalizeContainerEnvRowsForSave([
      {
        name: " DATABASE_URL ",
        value: "postgres://db:5432/app",
        valueSource: "direct",
      },
    ]),
    [{ name: "DATABASE_URL", value: "postgres://db:5432/app" }]
  );

  assert.equal(
    containerEnvRowsEqual(
      [{ name: "DATABASE_URL", value: "postgres://db:5432/app" }],
      [
        {
          name: "DATABASE_URL",
          value: "postgres://db:5432/app",
          valueSource: "direct",
        },
      ]
    ),
    true
  );

  assert.equal(
    containerEnvRowsEqual(
      [
        {
          name: "DATABASE_PASSWORD",
          value: "(valueFrom)",
          valueFrom: { secretKeyRef: { key: "password", name: "db" } },
          valueSource: "valueFrom",
        },
      ],
      [
        {
          name: "DATABASE_PASSWORD",
          value: "External reference",
          valueFrom: { secretKeyRef: { key: "password", name: "db" } },
          valueSource: "valueFrom",
        },
      ]
    ),
    true
  );
});

test("container env rows add DB DSN references with private DSN as the default field", () => {
  const dbs = [
    {
      name: "postgres",
      namespace: "default",
      privateDsn: "postgres://private",
      publicDsn: "postgres://public",
    },
  ];

  assert.deepEqual(containerEnvDbDsnFieldOptions(dbs[0]), [
    { field: "private", label: "Private DSN", value: "postgres://private" },
    { field: "public", label: "Public DSN", value: "postgres://public" },
  ]);

  const rows = addContainerEnvDbDsnReferenceRow([], dbs);

  assert.deepEqual(rows, [
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "private",
      },
      name: "NEW_VARIABLE",
      value: "postgres://private",
      valueSource: "dbDsn",
    },
  ]);
  assert.deepEqual(normalizeContainerEnvRowsForSave(rows), [
    { name: "NEW_VARIABLE", value: "postgres://private" },
  ]);
});

test("container env rows omit unavailable public DSNs and cannot add DBs without DSNs", () => {
  assert.deepEqual(
    containerEnvDbDsnFieldOptions({
      name: "private-only",
      namespace: "default",
      privateDsn: "postgres://private",
    }),
    [{ field: "private", label: "Private DSN", value: "postgres://private" }]
  );

  assert.deepEqual(
    addContainerEnvDbDsnReferenceRow(
      [],
      [{ name: "empty", namespace: "default" }]
    ),
    []
  );
});

test("container env rows reconstruct DB DSN references only by exact value equality", () => {
  const sources = [
    {
      name: "postgres",
      namespace: "default",
      privateDsn: "postgres://private",
      publicDsn: "postgres://public",
    },
  ];

  assert.deepEqual(
    containerEnvDbDsnReferenceFromValue("postgres://private", sources),
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "private",
      },
      value: "postgres://private",
      valueSource: "dbDsn",
    }
  );
  assert.equal(
    containerEnvDbDsnReferenceFromValue("postgres://private ", sources),
    undefined
  );
  assert.equal(
    containerEnvDbDsnReferenceFromValue(
      "postgres://private?looks-like-dsn",
      sources
    ),
    undefined
  );
});
