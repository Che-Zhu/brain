import assert from "node:assert/strict";
import { test } from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import type { ContainerEnvVar } from "./container-settings-pane";
import {
  ContainerSettingsPane,
  confirmedAddDbDsnReferencesFromEnvDraft,
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
const NEW_VARIABLE_RE = /value="NEW_VARIABLE"/;
const MYSQL_OPTION_SELECTED_RE =
  /<option value="default\/mysql" selected="">mysql/;

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
