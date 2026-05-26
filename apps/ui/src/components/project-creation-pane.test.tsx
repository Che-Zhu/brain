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
const DESCRIPTION_FIELD_RE = /Description/;
const DESCRIPTION_RE =
  /Provide a project name and select the project creation method/;
const DIALOG_OVERLAY_RE = /data-slot="dialog-overlay"/;
const DIALOG_ROLE_RE = /role="dialog"/;
const DOCKER_IMAGE_RE = /Docker image/;
const AUTO_GENERATED_PUBLIC_ADDRESS_RE = /Auto-generated Public Address/;
const PANE_LABEL_RE = /aria-label="Project creation pane"/;
const PROJECT_NAME_RE = /Project Name/;
const PROJECT_TITLE_RE = /Create New Project/;
const REPO_SELECT_RE = /Search or choose repository/;
const SCENARIO_RE = /Scenario/;
const TRAIL_BACK_RE = />Back</;
const DATABASE_DEPLOYER_RE = /data-slot="database-deployer"/;
const DOCKER_DEPLOYER_RE = /data-slot="docker-deployer"/;

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
  assert.match(html, PROJECT_NAME_RE);
  assert.match(html, CLOSE_LABEL_RE);
  assert.doesNotMatch(html, DIALOG_ROLE_RE);
  assert.doesNotMatch(html, DIALOG_OVERLAY_RE);
  assert.doesNotMatch(html, DESCRIPTION_FIELD_RE);

  const github = html.indexOf("GitHub");
  const docker = html.indexOf("Docker Image");
  const database = html.indexOf("Database");

  assert.ok(github !== -1, "GitHub method is visible");
  assert.ok(docker !== -1, "Docker Image method is visible");
  assert.ok(database !== -1, "Database method is visible");
  assert.ok(github < docker, "GitHub appears before Docker Image");
  assert.ok(docker < database, "Docker Image appears before Database");
});

test("project creation pane GitHub direct entry starts at repository selection", () => {
  const html = renderToStaticMarkup(
    <ProjectCreationPane
      creatorRootProps={{
        databaseOptions: [],
        githubDeployer: {
          states: {
            deployedRepo: null,
            githubToken: "gho_test",
            isLoading: false,
            repos: [
              {
                fullName: "acme/api",
                id: "repo-1",
                name: "api",
              },
            ],
          },
        },
      }}
      entryMode="githubDirect"
      onClose={noop}
      resetKey={1}
    />
  );

  assert.match(html, PANE_LABEL_RE);
  assert.match(html, REPO_SELECT_RE);
  assert.doesNotMatch(html, PROJECT_NAME_RE);
  assert.doesNotMatch(html, SCENARIO_RE);
  assert.doesNotMatch(html, TRAIL_BACK_RE);
});

test("project creation pane database direct entry keeps project naming and opens deployment settings", () => {
  const html = renderToStaticMarkup(
    <ProjectCreationPane
      creatorRootProps={{ databaseOptions: [] }}
      entryMode="databaseDirect"
      onClose={noop}
      resetKey={1}
    />
  );

  assert.match(html, PANE_LABEL_RE);
  assert.match(html, PROJECT_NAME_RE);
  assert.match(html, DATABASE_DEPLOYER_RE);
  assert.doesNotMatch(html, SCENARIO_RE);
  assert.doesNotMatch(html, TRAIL_BACK_RE);
});

test("project creation pane Docker direct entry opens Docker deployment settings without generic project naming first", () => {
  const html = renderToStaticMarkup(
    <ProjectCreationPane
      creatorRootProps={{
        actions: {
          deriveDockerProjectDisplayName: () => "api",
        },
        databaseOptions: [],
      }}
      entryMode="dockerDirect"
      onClose={noop}
      resetKey={1}
    />
  );

  assert.match(html, PANE_LABEL_RE);
  assert.match(html, DOCKER_DEPLOYER_RE);
  assert.match(html, DOCKER_IMAGE_RE);
  assert.match(html, AUTO_GENERATED_PUBLIC_ADDRESS_RE);
  assert.doesNotMatch(html, PROJECT_NAME_RE);
  assert.doesNotMatch(html, SCENARIO_RE);
  assert.doesNotMatch(html, TRAIL_BACK_RE);
});
