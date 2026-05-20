import assert from "node:assert/strict";
import { test } from "node:test";

import { patchOpsForApEnvSettings } from "./ap-json-patch";

const DUPLICATE_ENV_NAME_RE = /Environment variable names must be unique/;

test("AP env settings patch direct rows as standard Kubernetes value entries", () => {
  const ops = patchOpsForApEnvSettings(
    {
      input: {
        env: [{ name: "DATABASE_URL", value: "postgres://old" }],
        image: "ghcr.io/acme/app:old",
      },
      resource: { replicas: 2 },
    },
    [
      { name: "DATABASE_URL", value: "postgres://db:5432/app" },
      { name: "FEATURE_FLAG", value: "true" },
    ]
  );

  assert.deepEqual(ops, [
    {
      op: "replace",
      path: "/spec/input/env",
      value: [
        { name: "DATABASE_URL", value: "postgres://db:5432/app" },
        { name: "FEATURE_FLAG", value: "true" },
      ],
    },
  ]);
});

test("AP env settings reject duplicate row names before patching", () => {
  assert.throws(
    () =>
      patchOpsForApEnvSettings({ input: { env: [] } }, [
        { name: "DATABASE_URL", value: "postgres://primary" },
        { name: "DATABASE_URL", value: "postgres://replica" },
      ]),
    DUPLICATE_ENV_NAME_RE
  );
});

test("AP env settings patch DB DSN references as plain value entries", () => {
  const ops = patchOpsForApEnvSettings({ input: { env: [] } }, [
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "private",
      },
      name: "DATABASE_URL",
      value: "postgres://private",
      valueSource: "dbDsn",
    },
  ]);

  assert.deepEqual(ops, [
    {
      op: "replace",
      path: "/spec/input/env",
      value: [{ name: "DATABASE_URL", value: "postgres://private" }],
    },
  ]);
});

test("AP env settings patch DB primitive references as Secret key refs", () => {
  const secretKeyRef = { key: "passwd", name: "postgres-conn-credential" };
  const ops = patchOpsForApEnvSettings({ input: { env: [] } }, [
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "password",
      },
      name: "DATABASE_PASSWORD",
      value: "(valueFrom)",
      valueFrom: { secretKeyRef },
      valueSource: "dbDsn",
    },
  ]);

  assert.deepEqual(ops, [
    {
      op: "replace",
      path: "/spec/input/env",
      value: [
        {
          name: "DATABASE_PASSWORD",
          valueFrom: { secretKeyRef },
        },
      ],
    },
  ]);
});

test("AP env settings reject duplicate names across direct and DB DSN reference rows", () => {
  assert.throws(
    () =>
      patchOpsForApEnvSettings({ input: { env: [] } }, [
        { name: "DATABASE_URL", value: "postgres://manual" },
        {
          dbDsn: {
            dbName: "postgres",
            dbNamespace: "default",
            field: "private",
          },
          name: "DATABASE_URL",
          value: "postgres://private",
          valueSource: "dbDsn",
        },
      ]),
    DUPLICATE_ENV_NAME_RE
  );
});

test("AP env settings preserve non-direct rows unless they are deleted", () => {
  const secretKeyRef = { key: "password", name: "external-db" };
  const spec = {
    input: {
      env: [
        { name: "DATABASE_URL", value: "postgres://db:5432/app" },
        { name: "DATABASE_PASSWORD", valueFrom: { secretKeyRef } },
      ],
    },
  };

  assert.deepEqual(
    patchOpsForApEnvSettings(spec, [
      { name: "DATABASE_URL", value: "postgres://db:5432/app" },
      {
        name: "DATABASE_PASSWORD",
        value: "(valueFrom)",
        valueFrom: { secretKeyRef },
        valueSource: "valueFrom",
      },
    ])[0]?.value,
    [
      { name: "DATABASE_URL", value: "postgres://db:5432/app" },
      { name: "DATABASE_PASSWORD", valueFrom: { secretKeyRef } },
    ]
  );

  assert.deepEqual(
    patchOpsForApEnvSettings(spec, [
      { name: "DATABASE_URL", value: "postgres://db:5432/app" },
    ])[0]?.value,
    [{ name: "DATABASE_URL", value: "postgres://db:5432/app" }]
  );
});
