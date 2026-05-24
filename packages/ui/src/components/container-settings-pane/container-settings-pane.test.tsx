import assert from "node:assert/strict";
import { test } from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import type {
  ContainerEnvVar,
  ContainerReplicaStrategy,
} from "./container-settings-pane";
import {
  ContainerSettingsPane,
  confirmedAddDbDsnReferencesFromEnvDraft,
  containerSettingsDraftIsDirty,
  resourceQuotaReplicaPatchFromDraft,
} from "./container-settings-pane";

const noop = () => {
  /* test noop */
};

const ENV_ROWS_SLOT_RE = /data-slot="container-env-rows"/;
const ENV_NAME_INPUT_RE = /aria-label="Environment variable name"/;
const ENV_VALUE_INPUT_RE = /aria-label="Environment variable value"/;
const RAW_ENV_EDITOR_RE = /Edit environment variables/;
const DATABASE_URL_RE = /DATABASE_URL/;
const ADD_ENV_RE = /aria-label="Add environment variable"/;
const ADD_REFERENCE_RE = /aria-label="Add Project DB reference"/;
const ADD_REFERENCE_LABEL_RE = /Add Reference/;
const DB_FIELD_SELECT_RE = /aria-label="Project DB field"/;
const PASSWORD_FIELD_RE = /Password/;
const UNAVAILABLE_DB_RE = /empty \(unavailable\)/;
const REMOVE_ENV_RE = /aria-label="Remove environment variable"/;
const SAVE_ENV_RE = /Save environment/;
const SAVE_SETTINGS_RE = /aria-label="Save settings"/;
const CANCEL_ENV_RE = /Cancel environment changes/;
const CANCEL_SETTINGS_RE = /aria-label="Cancel settings changes"/;
const NEW_VARIABLE_RE = /value="NEW_VARIABLE"/;
const MYSQL_OPTION_SELECTED_RE =
  /<option value="default\/mysql" selected="">mysql/;
const NETWORK_SECTION_RE = /Network/;
const PRIVATE_ADDRESS_RE = /Private Address/;
const PRIVATE_ADDRESS_TARGET_RE = /Private Address target port/;
const PRIVATE_ADDRESS_DEFAULT_VALUE_RE =
  /http:\/\/api-service.default.svc:8080/;
const PRIVATE_ADDRESS_VALUE_RE =
  /http:\/\/api-service-port-8080.default.svc:8080/;
const COPY_PRIVATE_ADDRESS_RE = /aria-label="Copy Private Address"/;
const DOMAIN_LIST_RE = /Domain List/;
const NO_DOMAINS_RE = /No domains yet/;
const PUBLIC_ADDRESS_VALUE_RE = /https:\/\/api.example.com\//;
const PUBLIC_ADDRESS_STATUS_RE = /Public Address status: accessible/;
const COPY_PUBLIC_ADDRESS_RE = /aria-label="Copy Public Address"/;
const CNAME_RE = /CNAME/;
const DELETE_PUBLIC_ADDRESS_RE = /aria-label="Delete Public Address"/;
const ADD_PUBLIC_ADDRESS_RE = /aria-label="Add Public Address"/;
const ADD_DOMAIN_RE = /Add Domain/;
const PORTS_TABLE_RE = /data-slot="ports-table"/;
const PRIVATE_PORT_VALUE_RE = /value="8080"/;
const REPLICA_STRATEGY_RE = /Replica Strategy/;
const FIXED_REPLICAS_RE = /Fixed Replicas/;
const ELASTIC_SCALING_RE = /Elastic Scaling/;
const REPLICA_COUNT_RE = /Number of Replicas/;
const REPLICA_VALUE_RE = />4 Replicas</;
const MIN_REPLICAS_RE = /Minimum replicas/;
const MIN_REPLICA_VALUE_RE = />2 Replicas</;
const MAX_REPLICAS_RE = /Maximum replicas/;
const MAX_REPLICA_VALUE_RE = />8 Replicas</;
const CPU_TARGET_RE = /CPU utilization target/;
const CPU_TARGET_VALUE_RE = />75%/;
const CPU_TARGET_PERCENT_RE = />75%</;
const SCALING_TARGET_RE = /Scaling target/;
const MEMORY_TARGET_RE = /Memory average target/;
const MEMORY_TARGET_VALUE_RE = />512 Mi</;
const MEMORY_TARGET_QUANTITY_RE = />512 Mi</;
const BUTTON_RE = /<button/;

function renderPane(
  readOnly = false,
  env: ContainerEnvVar[] = [
    { name: "DATABASE_URL", value: "postgres://db:5432/app" },
  ]
): string {
  return renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      dbDsnReferenceSources={[
        {
          name: "empty",
          namespace: "default",
        },
        {
          name: "postgres",
          namespace: "default",
          privateDsn: "postgres://private",
          primitiveSecretRefs: {
            password: {
              key: "passwd",
              name: "postgres-conn-credential",
            },
          },
        },
      ]}
      env={env}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      readOnly={readOnly}
    />
  );
}

test("container settings pane renders editable structured environment rows", () => {
  const html = renderPane();

  assert.match(html, ENV_ROWS_SLOT_RE);
  assert.match(html, ENV_NAME_INPUT_RE);
  assert.match(html, ENV_VALUE_INPUT_RE);
  assert.doesNotMatch(html, RAW_ENV_EDITOR_RE);
});

test("container settings pane shows no AP networking surface without Network data", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[{ port: 8080, protocol: "tcp" }]}
    />
  );

  assert.doesNotMatch(html, PORTS_TABLE_RE);
});

test("container settings pane renders Network instead of Ports for private-only APs", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      network={{
        privateAddress: "http://api-service-port-8080.default.svc:8080",
        privatePort: 8080,
        publicAddresses: [],
      }}
      onEnvChange={noop}
      onImageChange={noop}
      onNetworkChange={noop}
      onPortsChange={noop}
      ports={[{ port: 80, protocol: "tcp" }]}
    />
  );

  assert.match(html, NETWORK_SECTION_RE);
  assert.match(html, PRIVATE_ADDRESS_RE);
  assert.match(html, PRIVATE_ADDRESS_VALUE_RE);
  assert.match(html, PRIVATE_ADDRESS_TARGET_RE);
  assert.match(html, PRIVATE_PORT_VALUE_RE);
  assert.match(html, COPY_PRIVATE_ADDRESS_RE);
  assert.match(html, DOMAIN_LIST_RE);
  assert.match(html, NO_DOMAINS_RE);
  assert.doesNotMatch(html, PORTS_TABLE_RE);
});

test("container settings pane renders editable public address rows", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      network={{
        privateAddress: "http://api-service.default.svc:8080",
        privatePort: 8080,
        publicAddresses: [
          {
            host: "api.example.com",
            port: 8080,
            status: "accessible",
            type: "platform",
            url: "https://api.example.com/",
          },
        ],
      }}
      onEnvChange={noop}
      onImageChange={noop}
      onNetworkChange={noop}
      onPortsChange={noop}
      ports={[]}
    />
  );

  assert.match(html, DOMAIN_LIST_RE);
  assert.match(html, PUBLIC_ADDRESS_VALUE_RE);
  assert.match(html, PUBLIC_ADDRESS_STATUS_RE);
  assert.match(html, COPY_PUBLIC_ADDRESS_RE);
  assert.match(html, CNAME_RE);
  assert.match(html, DELETE_PUBLIC_ADDRESS_RE);
  assert.match(html, ADD_PUBLIC_ADDRESS_RE);
  assert.match(html, ADD_DOMAIN_RE);
  assert.doesNotMatch(html, NO_DOMAINS_RE);
});

test("container settings pane renders fixed replica strategy controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      replicaStrategy={{
        fixed: { replicas: 4 },
        type: "fixed",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, FIXED_REPLICAS_RE);
  assert.match(html, ELASTIC_SCALING_RE);
  assert.match(html, REPLICA_COUNT_RE);
  assert.match(html, REPLICA_VALUE_RE);
});

test("container settings pane renders CPU elastic replica strategy controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      replicaStrategy={{
        elastic: {
          maxReplicas: 8,
          minReplicas: 2,
          target: {
            metric: "cpu",
            type: "utilization",
            utilizationPercent: 75,
          },
        },
        fixed: { replicas: 4 },
        type: "elastic",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, FIXED_REPLICAS_RE);
  assert.match(html, ELASTIC_SCALING_RE);
  assert.match(html, MIN_REPLICAS_RE);
  assert.match(html, MIN_REPLICA_VALUE_RE);
  assert.match(html, MAX_REPLICAS_RE);
  assert.match(html, MAX_REPLICA_VALUE_RE);
  assert.match(html, CPU_TARGET_RE);
  assert.match(html, CPU_TARGET_VALUE_RE);
  assert.doesNotMatch(html, REPLICA_COUNT_RE);
});

test("container settings pane renders Memory elastic replica strategy controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      replicaStrategy={{
        elastic: {
          maxReplicas: 8,
          minReplicas: 2,
          target: {
            averageValue: "512Mi",
            metric: "memory",
            type: "averageValue",
          },
        },
        fixed: { replicas: 4 },
        type: "elastic",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, SCALING_TARGET_RE);
  assert.match(html, CPU_TARGET_RE);
  assert.match(html, MEMORY_TARGET_RE);
  assert.match(html, MEMORY_TARGET_VALUE_RE);
  assert.doesNotMatch(html, REPLICA_COUNT_RE);
});

test("container settings pane fixed save payload preserves inactive elastic branch", () => {
  const draft: ContainerReplicaStrategy = {
    elastic: {
      maxReplicas: 9,
      minReplicas: 3,
      target: {
        averageValue: "768Mi",
        metric: "memory",
        type: "averageValue",
      },
    },
    fixed: { replicas: 4 },
    type: "fixed",
  };

  assert.deepEqual(resourceQuotaReplicaPatchFromDraft(true, draft), {
    replicaStrategy: draft,
  });
});

test("read-only container settings view renders fixed replica strategy without mutation controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      readOnly
      replicaStrategy={{
        fixed: { replicas: 4 },
        type: "fixed",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, FIXED_REPLICAS_RE);
  assert.match(html, REPLICA_COUNT_RE);
  assert.match(html, REPLICA_VALUE_RE);
  assert.doesNotMatch(html, ELASTIC_SCALING_RE);
  assert.doesNotMatch(html, BUTTON_RE);
});

test("read-only container settings view renders CPU elastic replica strategy without mutation controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      readOnly
      replicaStrategy={{
        elastic: {
          maxReplicas: 8,
          minReplicas: 2,
          target: {
            metric: "cpu",
            type: "utilization",
            utilizationPercent: 75,
          },
        },
        fixed: { replicas: 4 },
        type: "elastic",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, ELASTIC_SCALING_RE);
  assert.match(html, MIN_REPLICAS_RE);
  assert.match(html, MIN_REPLICA_VALUE_RE);
  assert.match(html, MAX_REPLICAS_RE);
  assert.match(html, MAX_REPLICA_VALUE_RE);
  assert.match(html, SCALING_TARGET_RE);
  assert.match(html, CPU_TARGET_RE);
  assert.match(html, CPU_TARGET_PERCENT_RE);
  assert.doesNotMatch(html, FIXED_REPLICAS_RE);
  assert.doesNotMatch(html, BUTTON_RE);
});

test("read-only container settings view renders Memory elastic replica strategy without mutation controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
      readOnly
      replicaStrategy={{
        elastic: {
          maxReplicas: 8,
          minReplicas: 2,
          target: {
            averageValue: "512Mi",
            metric: "memory",
            type: "averageValue",
          },
        },
        fixed: { replicas: 4 },
        type: "elastic",
      }}
      replicasQuota={{ onValueChange: noop, value: 4 }}
    />
  );

  assert.match(html, REPLICA_STRATEGY_RE);
  assert.match(html, ELASTIC_SCALING_RE);
  assert.match(html, MIN_REPLICAS_RE);
  assert.match(html, MAX_REPLICAS_RE);
  assert.match(html, SCALING_TARGET_RE);
  assert.match(html, MEMORY_TARGET_RE);
  assert.match(html, MEMORY_TARGET_QUANTITY_RE);
  assert.doesNotMatch(html, FIXED_REPLICAS_RE);
  assert.doesNotMatch(html, BUTTON_RE);
});

test("read-only network view renders addresses without mutation controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      network={{
        privateAddress: "http://api-service.default.svc:8080",
        privatePort: 8080,
        publicAddresses: [
          {
            host: "api.example.com",
            port: 8080,
            status: "accessible",
            type: "platform",
            url: "https://api.example.com/",
          },
        ],
      }}
      onEnvChange={noop}
      onImageChange={noop}
      onNetworkChange={noop}
      onPortsChange={noop}
      ports={[{ port: 80, protocol: "tcp" }]}
      readOnly
    />
  );

  assert.match(html, NETWORK_SECTION_RE);
  assert.match(html, PRIVATE_ADDRESS_RE);
  assert.match(html, PRIVATE_ADDRESS_DEFAULT_VALUE_RE);
  assert.match(html, DOMAIN_LIST_RE);
  assert.match(html, PUBLIC_ADDRESS_VALUE_RE);
  assert.match(html, COPY_PRIVATE_ADDRESS_RE);
  assert.match(html, COPY_PUBLIC_ADDRESS_RE);
  assert.doesNotMatch(html, ADD_PUBLIC_ADDRESS_RE);
  assert.doesNotMatch(html, DELETE_PUBLIC_ADDRESS_RE);
  assert.doesNotMatch(html, PORTS_TABLE_RE);
});

test("read-only container settings view cannot mutate environment rows", () => {
  const html = renderPane(true);

  assert.match(html, ENV_ROWS_SLOT_RE);
  assert.match(html, DATABASE_URL_RE);
  assert.doesNotMatch(html, ADD_ENV_RE);
  assert.doesNotMatch(html, REMOVE_ENV_RE);
  assert.doesNotMatch(html, SAVE_ENV_RE);
});

test("container settings pane offers DB DSN reference rows only in editable mode", () => {
  const html = renderPane();

  assert.match(html, ADD_REFERENCE_RE);
  assert.match(html, ADD_REFERENCE_LABEL_RE);

  const readOnlyHtml = renderPane(true);

  assert.doesNotMatch(readOnlyHtml, ADD_REFERENCE_RE);
});

test("container settings pane renders primitive DB fields and unavailable DB options", () => {
  const html = renderPane(false, [
    {
      dbDsn: {
        dbName: "postgres",
        dbNamespace: "default",
        field: "password",
      },
      name: "DATABASE_PASSWORD",
      value: "(valueFrom)",
      valueFrom: {
        secretKeyRef: {
          key: "passwd",
          name: "postgres-conn-credential",
        },
      },
      valueSource: "dbDsn",
    },
  ]);

  assert.match(html, DB_FIELD_SELECT_RE);
  assert.match(html, PASSWORD_FIELD_RE);
  assert.match(html, UNAVAILABLE_DB_RE);
});

test("container settings pane opens dragged DB Add Reference intent preselected", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      addDbDsnReferenceIntent={{
        dbName: "mysql",
        dbNamespace: "default",
        id: "drag-1",
      }}
      cpuQuota={{ onValueChange: noop, value: 1 }}
      dbDsnReferenceSources={[
        {
          name: "postgres",
          namespace: "default",
          privateDsn: "postgres://private",
        },
        {
          name: "mysql",
          namespace: "default",
          privateDsn: "mysql://private",
        },
      ]}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      ports={[]}
    />
  );

  assert.match(html, NEW_VARIABLE_RE);
  assert.match(html, MYSQL_OPTION_SELECTED_RE);
  assert.match(html, DB_FIELD_SELECT_RE);
  assert.match(html, SAVE_ENV_RE);
});

test("container settings pane reports confirmed dragged DB reference rows from the saved draft", () => {
  const draftRow = {
    canvasAddDbDsnReferenceIntentId: "drag-1",
    dbDsn: {
      dbName: "mysql",
      dbNamespace: "default",
      field: "private",
    },
    name: "DATABASE_URL",
    value: "mysql://private",
    valueSource: "dbDsn",
  } satisfies ContainerEnvVar & { canvasAddDbDsnReferenceIntentId: string };

  assert.deepEqual(confirmedAddDbDsnReferencesFromEnvDraft([draftRow]), [
    { dbName: "mysql", dbNamespace: "default", id: "drag-1" },
  ]);
});

test("container settings draft detects dirty AP settings and restored state", () => {
  const original = {
    cpuCores: 1,
    env: [{ name: "DATABASE_URL", value: "postgres://old" }],
    image: "ghcr.io/acme/api:old",
    memoryMib: 1024,
    network: {
      privatePort: 80,
      publicAddresses: [{ id: "pa_old123", port: 80 }],
    },
    replicaStrategy: {
      fixed: { replicas: 2 },
      type: "fixed",
    },
  } satisfies Parameters<typeof containerSettingsDraftIsDirty>[0];

  assert.equal(containerSettingsDraftIsDirty(original, original), false);
  assert.equal(
    containerSettingsDraftIsDirty(original, {
      ...original,
      env: [...original.env, { name: "FEATURE_FLAG", value: "true" }],
      image: "ghcr.io/acme/api:new",
      network: {
        privatePort: 8080,
        publicAddresses: [
          { id: "pa_old123", port: 80 },
          { id: "pa_new456", port: 9000 },
        ],
      },
      replicaStrategy: {
        elastic: {
          maxReplicas: 8,
          minReplicas: 2,
          target: {
            metric: "cpu",
            type: "utilization",
            utilizationPercent: 75,
          },
        },
        fixed: { replicas: 2 },
        type: "elastic",
      },
    }),
    true
  );
  assert.equal(containerSettingsDraftIsDirty(original, { ...original }), false);
});

test("container settings pane exposes panel-level draft actions without environment save controls", () => {
  const html = renderToStaticMarkup(
    <ContainerSettingsPane
      addDbDsnReferenceIntent={{
        dbName: "mysql",
        dbNamespace: "default",
        id: "drag-1",
      }}
      cpuQuota={{ onValueChange: noop, value: 1 }}
      dbDsnReferenceSources={[
        {
          name: "mysql",
          namespace: "default",
          privateDsn: "mysql://private",
        },
      ]}
      env={[]}
      image="ghcr.io/acme/api:latest"
      memoryQuota={{ onValueChange: noop, value: 512 }}
      onEnvChange={noop}
      onImageChange={noop}
      onPortsChange={noop}
      onSettingsDraftCommit={noop}
      ports={[]}
    />
  );

  assert.match(html, SAVE_SETTINGS_RE);
  assert.match(html, CANCEL_SETTINGS_RE);
  assert.doesNotMatch(html, SAVE_ENV_RE);
  assert.doesNotMatch(html, CANCEL_ENV_RE);
});
