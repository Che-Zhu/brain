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
