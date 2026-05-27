import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { CANVAS_ACTION } from "@/store/canvas-store";
import { CanvasActionSurface } from "./canvas-action-surface";

const noop = () => {
  /* test noop */
};

const CLOSE_LABEL_RE = /Close canvas action surface/;
const LABEL_RE = /aria-label="Canvas action surface"/;
const NAME_RE = /orders-db/;
const RESOURCE_PANE_SURFACE_RE = /resource-pane-surface/;
const SLOT_RE = /data-slot="canvas-action-surface-body"/;
const SUBTITLE_RE = /Database PostgreSQL 16.4/;
const WORKBENCH_RE = /data-slot="db-access-workbench"/;

const databaseData = {
  connections: [],
  states: {
    displayEngine: "PostgreSQL",
    formattedVersion: "16.4",
    name: "orders-db",
  },
  workload: {
    name: "orders-db",
    namespace: "default",
  },
} satisfies CanvasDatabaseNodeData;

test("canvas action surface renders shared chrome and empty body slot", () => {
  const html = renderToStaticMarkup(
    <CanvasActionSurface
      action={CANVAS_ACTION.dbAccess}
      kubeconfig="apiVersion: v1"
      namespace="default"
      onClose={noop}
      projectUid="project-1"
      selectedDatabaseData={databaseData}
    />
  );

  assert.match(html, LABEL_RE);
  assert.match(html, NAME_RE);
  assert.match(html, SUBTITLE_RE);
  assert.match(html, CLOSE_LABEL_RE);
  assert.match(html, RESOURCE_PANE_SURFACE_RE);
  assert.match(html, SLOT_RE);
  assert.match(html, WORKBENCH_RE);
});

test("canvas action surface stays absent without supported action data", () => {
  const html = renderToStaticMarkup(
    <CanvasActionSurface
      action={CANVAS_ACTION.dbAccess}
      onClose={noop}
      selectedDatabaseData={null}
    />
  );

  assert.equal(html, "");
});

test("canvas action surface excludes DB Access when the host disables it", () => {
  const html = renderToStaticMarkup(
    <CanvasActionSurface
      action={CANVAS_ACTION.dbAccess}
      dbAccessAvailable={false}
      kubeconfig="apiVersion: v1"
      namespace="default"
      onClose={noop}
      projectUid="project-1"
      selectedDatabaseData={databaseData}
    />
  );

  assert.equal(html, "");
});
