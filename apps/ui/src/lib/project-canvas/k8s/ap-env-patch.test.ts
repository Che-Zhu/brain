import assert from "node:assert/strict";
import { test } from "node:test";

import {
  patchOpsForApEnvSettings,
  patchOpsForApNetworkSettings,
} from "./ap-json-patch";

const DUPLICATE_ENV_NAME_RE = /Environment variable names must be unique/;
const PRIVATE_PORT_RANGE_RE =
  /Private Address target port must be an integer from 1 through 65535/;
const PUBLIC_PORT_RANGE_RE =
  /Public Address target port must be an integer from 1 through 65535/;
const PLATFORM_ADDRESS_ID_RE = /^pa_[a-z0-9]{6,32}$/;
const PLATFORM_ADDRESS_ID_INVALID_RE =
  /Platform Address ID must match \^pa_\[a-z0-9\]\{6,32\}\$/;
const PLATFORM_ADDRESS_ID_UNIQUE_RE = /Platform Address IDs must be unique/;

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

test("AP network settings patch privatePort without writing retired endpoint fields", () => {
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

test("AP network settings patch generated Platform Address IDs as one coherent network object", () => {
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

  assert.equal(ops.length, 4);
  assert.deepEqual(ops.slice(1), [
    { op: "remove", path: "/spec/input/endpoints" },
    { op: "remove", path: "/spec/input/port" },
    { op: "remove", path: "/spec/input/host" },
  ]);
  assert.equal(ops[0]?.op, "replace");
  assert.equal(ops[0]?.path, "/spec/input/network");
  const network = ops[0]?.value as {
    platformAddresses: { id: string; port: number }[];
    privatePort: number;
  };
  assert.equal(network.privatePort, 8080);
  assert.equal(network.platformAddresses.length, 2);
  assert.match(network.platformAddresses[0]?.id ?? "", PLATFORM_ADDRESS_ID_RE);
  assert.equal(network.platformAddresses[0]?.port, 8080);
  assert.match(network.platformAddresses[1]?.id ?? "", PLATFORM_ADDRESS_ID_RE);
  assert.equal(network.platformAddresses[1]?.port, 9000);
});

test("AP network settings writes v1 Platform Addresses with stable IDs and no host or URL", () => {
  const ops = patchOpsForApNetworkSettings(
    {
      input: {
        network: {
          privatePort: 80,
          publicAddresses: [{ host: "old.example.com", port: 80 }],
        },
      },
    },
    {
      privatePort: 8080,
      publicAddresses: [
        {
          host: "api.example.com",
          id: "pa_abc123",
          port: 8080,
          status: "accessible",
          type: "platform",
          url: "https://api.example.com/",
        },
        { id: "pa_def456", port: 8080 },
      ],
    }
  );

  assert.deepEqual(ops, [
    {
      op: "replace",
      path: "/spec/input/network",
      value: {
        privatePort: 8080,
        platformAddresses: [
          { id: "pa_abc123", port: 8080 },
          { id: "pa_def456", port: 8080 },
        ],
      },
    },
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

test("AP network settings validate Platform Address IDs and Public Address ports", () => {
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        { privatePort: 8080, publicAddresses: [{ id: "pa_BAD", port: 8080 }] }
      ),
    PLATFORM_ADDRESS_ID_INVALID_RE
  );
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        {
          privatePort: 8080,
          publicAddresses: [
            { id: "pa_abc123", port: 8080 },
            { id: "pa_abc123", port: 9000 },
          ],
        }
      ),
    PLATFORM_ADDRESS_ID_UNIQUE_RE
  );
  assert.throws(
    () =>
      patchOpsForApNetworkSettings(
        { input: {} },
        {
          privatePort: 8080,
          publicAddresses: [{ id: "pa_abc123", port: 65_536 }],
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
