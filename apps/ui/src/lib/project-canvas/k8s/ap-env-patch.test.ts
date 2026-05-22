import assert from "node:assert/strict";
import { test } from "node:test";

import {
  patchOpsForApEnvSettings,
  patchOpsForApNetworkSettings,
} from "./ap-json-patch";

const DUPLICATE_ENV_NAME_RE = /Environment variable names must be unique/;
const PRIVATE_PORT_RANGE_RE =
  /Private Address target port must be an integer from 1 through 65535/;
const PUBLIC_HOST_REQUIRED_RE = /Public Address host is required/;
const PUBLIC_HOST_UNIQUE_RE = /Public Address hosts must be unique/;
const PUBLIC_PORT_RANGE_RE =
  /Public Address target port must be an integer from 1 through 65535/;

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

test("AP network settings patch privatePort without writing legacy endpoints", () => {
  const ops = patchOpsForApNetworkSettings(
    {
      input: {
        endpoints: [{ host: "old.example.com", port: 80 }],
        host: "old.example.com",
        image: "ghcr.io/acme/app:old",
        port: 80,
      },
    },
    { privatePort: 8080 }
  );

  assert.deepEqual(ops, [
    {
      op: "add",
      path: "/spec/input/network",
      value: { privatePort: 8080 },
    },
    { op: "remove", path: "/spec/input/endpoints" },
    { op: "remove", path: "/spec/input/port" },
    { op: "remove", path: "/spec/input/host" },
  ]);
});

test("AP network settings patch public addresses as one coherent network object", () => {
  const ops = patchOpsForApNetworkSettings(
    {
      input: {
        endpoints: [{ host: "old.example.com", port: 80 }],
        host: "old.example.com",
        network: {
          privatePort: 80,
          publicAddresses: [{ host: "old.example.com", port: 80 }],
        },
        port: 80,
      },
    },
    {
      privatePort: 8080,
      publicAddresses: [
        {
          host: "api.example.com",
          port: 8080,
          status: "Accessible",
          type: "platform",
          url: "https://api.example.com/",
        },
        { host: "admin.example.com", port: 9000 },
      ],
    }
  );

  assert.deepEqual(ops, [
    {
      op: "replace",
      path: "/spec/input/network",
      value: {
        privatePort: 8080,
        publicAddresses: [
          { host: "api.example.com", port: 8080 },
          { host: "admin.example.com", port: 9000 },
        ],
      },
    },
    { op: "remove", path: "/spec/input/endpoints" },
    { op: "remove", path: "/spec/input/port" },
    { op: "remove", path: "/spec/input/host" },
  ]);
});

test("AP network settings validate App Listening Ports", () => {
  for (const privatePort of [1, 65_535]) {
    assert.deepEqual(
      patchOpsForApNetworkSettings({ input: {} }, { privatePort })[0]?.value,
      { privatePort }
    );
  }

  for (const privatePort of [0, 65_536, 8080.5]) {
    assert.throws(
      () => patchOpsForApNetworkSettings({ input: {} }, { privatePort }),
      PRIVATE_PORT_RANGE_RE
    );
  }
});

test("AP network settings validate Public Address hosts and ports", () => {
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        { privatePort: 8080, publicAddresses: [{ host: "  ", port: 8080 }] }
      ),
    PUBLIC_HOST_REQUIRED_RE
  );
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        {
          privatePort: 8080,
          publicAddresses: [
            { host: "api.example.com", port: 8080 },
            { host: "API.example.com", port: 9000 },
          ],
        }
      ),
    PUBLIC_HOST_UNIQUE_RE
  );
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        {
          privatePort: 8080,
          publicAddresses: [{ host: "api.example.com", port: 65_536 }],
        }
      ),
    PUBLIC_PORT_RANGE_RE
  );
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
