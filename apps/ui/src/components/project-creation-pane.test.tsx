import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectCreationPane } from "./project-creation-pane";

const noop = () => {
  /* test noop */
};

const ASIDE_RE = /<aside/;
const BUSY_RE = /aria-busy="true"/;
const CLOSE_LABEL_RE = /aria-label="Close project creation pane"/;
const DESCRIPTION_RE = /Choose how to create a Project/;
const DIALOG_OVERLAY_RE = /data-slot="dialog-overlay"/;
const DIALOG_ROLE_RE = /role="dialog"/;
const PANE_LABEL_RE = /aria-label="Project creation pane"/;
const PROJECT_TITLE_RE = /New Project/;

test("project creation pane is a non-modal side pane with the method picker", () => {
  const html = renderToStaticMarkup(
    <ProjectCreationPane
      busy
      creatorRootProps={{ databaseOptions: [] }}
      onClose={noop}
      resetKey={1}
    />
  );

  assert.match(html, ASIDE_RE);
  assert.match(html, PANE_LABEL_RE);
  assert.match(html, BUSY_RE);
  assert.match(html, PROJECT_TITLE_RE);
  assert.match(html, DESCRIPTION_RE);
  assert.match(html, CLOSE_LABEL_RE);
  assert.doesNotMatch(html, DIALOG_ROLE_RE);
  assert.doesNotMatch(html, DIALOG_OVERLAY_RE);

  const github = html.indexOf("GitHub");
  const docker = html.indexOf("Docker Image");
  const database = html.indexOf("Database");

  assert.ok(github !== -1, "GitHub method is visible");
  assert.ok(docker !== -1, "Docker Image method is visible");
  assert.ok(database !== -1, "Database method is visible");
  assert.ok(github < docker, "GitHub appears before Docker Image");
  assert.ok(docker < database, "Docker Image appears before Database");
});
