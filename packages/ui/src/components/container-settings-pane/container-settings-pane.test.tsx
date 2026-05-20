import assert from "node:assert/strict";
import { test } from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ContainerSettingsPane } from "./container-settings-pane";

const noop = () => {
  /* test noop */
};

const ENV_ROWS_SLOT_RE = /data-slot="container-env-rows"/;
const ENV_NAME_INPUT_RE = /aria-label="Environment variable name"/;
const ENV_VALUE_INPUT_RE = /aria-label="Environment variable value"/;
const RAW_ENV_EDITOR_RE = /Edit environment variables/;
const DATABASE_URL_RE = /DATABASE_URL/;
const ADD_ENV_RE = /aria-label="Add environment variable"/;
const REMOVE_ENV_RE = /aria-label="Remove environment variable"/;
const SAVE_ENV_RE = /Save environment/;

function renderPane(readOnly = false): string {
  return renderToStaticMarkup(
    <ContainerSettingsPane
      cpuQuota={{ onValueChange: noop, value: 1 }}
      env={[{ name: "DATABASE_URL", value: "postgres://db:5432/app" }]}
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
