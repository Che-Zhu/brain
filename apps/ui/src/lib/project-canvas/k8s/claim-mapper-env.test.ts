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
