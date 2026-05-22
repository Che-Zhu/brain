import assert from "node:assert/strict";
import { test } from "node:test";

import { claimToContainerSettings } from "./claim-mapper";
import { dbDsnReferenceSourcesFromDbsData } from "./db-dsn-reference-sources";

test("AP claim settings reconstruct direct and non-direct environment rows", () => {
  const secretKeyRef = {
    key: "password",
    name: "external-db",
  };

  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          env: [
            { name: "DATABASE_URL", value: "postgres://db:5432/app" },
            { name: "DATABASE_PASSWORD", valueFrom: { secretKeyRef } },
          ],
          image: "ghcr.io/acme/api:latest",
        },
      },
    },
    "AP"
  );

  assert.deepEqual(settings.env, [
    { name: "DATABASE_URL", value: "postgres://db:5432/app" },
    {
      name: "DATABASE_PASSWORD",
      value: "(valueFrom)",
      valueFrom: { secretKeyRef },
      valueSource: "valueFrom",
    },
  ]);
});

test("AP claim settings maps private-only network from desired and observed AP state", () => {
  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          image: "ghcr.io/acme/api:latest",
          network: {
            privatePort: 8080,
          },
        },
      },
      status: {
        network: {
          privateAddress: "http://api-service-port-8080.default.svc:8080",
          privatePort: 8080,
        },
      },
    },
    "AP"
  );

  assert.deepEqual(settings.network, {
    privateAddress: "http://api-service-port-8080.default.svc:8080",
    privatePort: 8080,
    publicAddresses: [],
  });
  assert.deepEqual(settings.ports, []);
});

test("AP claim settings maps public addresses from observed AP network state", () => {
  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          image: "ghcr.io/acme/api:latest",
          network: {
            privatePort: 8080,
            publicAddresses: [
              { host: "api.example.com", port: 8080 },
              { host: "admin.example.com", port: 9000 },
            ],
          },
        },
      },
      status: {
        network: {
          privateAddress: "http://api-service-port-8080.default.svc:8080",
          privatePort: 8080,
          publicAddresses: [
            {
              host: "api.example.com",
              port: 8080,
              status: "accessible",
              type: "platform",
              url: "https://api.example.com/",
            },
            {
              host: "admin.example.com",
              port: 9000,
              status: "progressing",
              type: "platform",
              url: "http://admin.example.com/",
            },
          ],
        },
      },
    },
    "AP"
  );

  assert.deepEqual(settings.network?.publicAddresses, [
    {
      host: "api.example.com",
      port: 8080,
      status: "accessible",
      type: "platform",
      url: "https://api.example.com/",
    },
    {
      host: "admin.example.com",
      port: 9000,
      status: "progressing",
      type: "platform",
      url: "http://admin.example.com/",
    },
  ]);
});

test("AP claim settings falls back to desired public addresses while observed URLs are pending", () => {
  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          image: "ghcr.io/acme/api:latest",
          network: {
            privatePort: 8080,
            publicAddresses: [{ host: "api.example.com", port: 8080 }],
          },
        },
      },
      status: {
        network: {
          privateAddress: "http://api-service-port-8080.default.svc:8080",
          privatePort: 8080,
        },
      },
    },
    "AP"
  );

  assert.deepEqual(settings.network?.publicAddresses, [
    { host: "api.example.com", port: 8080 },
  ]);
});

test("AP claim settings ignores invalid private-only network ports", () => {
  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          image: "ghcr.io/acme/api:latest",
          network: {
            privatePort: 8080.5,
          },
        },
      },
    },
    "AP"
  );

  assert.equal(settings.network, undefined);
});

test("AP claim settings reconstruct DB DSN references only from exact current DB connection strings", () => {
  const dbDsnReferenceSources = dbDsnReferenceSourcesFromDbsData(
    {
      items: [
        {
          metadata: { name: "postgres", namespace: "default" },
          status: {
            connectionStringPrivate: "postgres://private",
            connectionStringPublic: "postgres://public",
          },
        },
        {
          metadata: { name: "empty", namespace: "default" },
          status: {},
        },
      ],
    },
    "default"
  );

  assert.deepEqual(dbDsnReferenceSources, [
    {
      name: "postgres",
      namespace: "default",
      privateDsn: "postgres://private",
      publicDsn: "postgres://public",
    },
    {
      name: "empty",
      namespace: "default",
    },
  ]);

  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          env: [
            { name: "DATABASE_URL", value: "postgres://private" },
            { name: "DATABASE_PUBLIC_URL", value: "postgres://public" },
            { name: "ALMOST_DATABASE_URL", value: "postgres://private " },
          ],
          image: "ghcr.io/acme/api:latest",
        },
      },
    },
    "AP",
    { dbDsnReferenceSources }
  );

  assert.deepEqual(settings.env, [
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
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "public",
      },
      name: "DATABASE_PUBLIC_URL",
      value: "postgres://public",
      valueSource: "dbDsn",
    },
    { name: "ALMOST_DATABASE_URL", value: "postgres://private " },
  ]);
});

test("AP claim settings reconstruct DB primitive references from exact Secret evidence", () => {
  const secretKeyRef = { key: "user", name: "postgres-conn-credential" };
  const dbDsnReferenceSources = dbDsnReferenceSourcesFromDbsData(
    {
      items: [
        {
          metadata: { name: "postgres", namespace: "default" },
          status: {
            variables: [
              {
                name: "PG_USER",
                valueFrom: { secretKeyRef },
              },
            ],
          },
        },
      ],
    },
    "default"
  );

  assert.deepEqual(dbDsnReferenceSources, [
    {
      name: "postgres",
      namespace: "default",
      primitiveSecretRefs: {
        username: secretKeyRef,
      },
    },
  ]);

  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          env: [
            {
              name: "DATABASE_USER",
              valueFrom: { secretKeyRef },
            },
          ],
          image: "ghcr.io/acme/api:latest",
        },
      },
    },
    "AP",
    { dbDsnReferenceSources }
  );

  assert.deepEqual(settings.env, [
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "username",
      },
      name: "DATABASE_USER",
      value: "(valueFrom)",
      valueFrom: { secretKeyRef },
      valueSource: "dbDsn",
    },
  ]);
});

test("AP claim settings leave non-matching Secret rows as external rows", () => {
  const dbDsnReferenceSources = dbDsnReferenceSourcesFromDbsData(
    {
      items: [
        {
          metadata: { name: "postgres", namespace: "default" },
          status: {
            variables: [
              {
                name: "PG_USER",
                valueFrom: {
                  secretKeyRef: {
                    key: "user",
                    name: "postgres-conn-credential",
                  },
                },
              },
            ],
          },
        },
      ],
    },
    "default"
  );
  const wrongName = {
    key: "user",
    name: "external-db",
  };
  const wrongKey = {
    key: "database",
    name: "postgres-conn-credential",
  };

  const settings = claimToContainerSettings(
    {
      kind: "AP",
      metadata: { name: "api", namespace: "default" },
      spec: {
        input: {
          env: [
            {
              name: "EXTERNAL_USER",
              valueFrom: { secretKeyRef: wrongName },
            },
            {
              name: "DATABASE_NAME",
              valueFrom: { secretKeyRef: wrongKey },
            },
          ],
        },
      },
    },
    "AP",
    { dbDsnReferenceSources }
  );

  assert.deepEqual(settings.env, [
    {
      name: "EXTERNAL_USER",
      value: "(valueFrom)",
      valueFrom: { secretKeyRef: wrongName },
      valueSource: "valueFrom",
    },
    {
      name: "DATABASE_NAME",
      value: "(valueFrom)",
      valueFrom: { secretKeyRef: wrongKey },
      valueSource: "valueFrom",
    },
  ]);
});
