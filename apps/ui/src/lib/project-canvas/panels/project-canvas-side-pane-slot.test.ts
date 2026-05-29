import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ProjectCanvasSidePaneSlot,
  resolveProjectCanvasSidePaneEntry,
} from "./project-canvas-side-pane-slot";

const GITHUB_DEPLOYMENT_RE = /GitHub deployment/;
const DATABASE_DEPLOYMENT_RE = /Database deployment/;
const DOCKER_DEPLOYMENT_RE = /Docker deployment/;
const RESOURCE_SETTINGS_RE = /Resource settings/;
const SKILL_LIBRARY_RE = /Skill library/;

test("github deployment stays active while resource selection is being cleared", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      githubDeploymentPaneOpen: true,
      preferredEntry: "githubDeployment",
      resourcePaneOpen: true,
    }),
    { kind: "githubDeployment" }
  );
});

test("database deployment stays active while resource selection is being cleared", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      databaseDeploymentPaneOpen: true,
      githubDeploymentPaneOpen: false,
      preferredEntry: "databaseDeployment",
      resourcePaneOpen: true,
    }),
    { kind: "databaseDeployment" }
  );
});

test("docker deployment stays active while resource selection is being cleared", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      dockerDeploymentPaneOpen: true,
      githubDeploymentPaneOpen: false,
      preferredEntry: "dockerDeployment",
      resourcePaneOpen: true,
    }),
    { kind: "dockerDeployment" }
  );
});

test("skill library stays active while resource selection is being cleared", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      githubDeploymentPaneOpen: false,
      preferredEntry: "skillLibrary",
      resourcePaneOpen: true,
      skillLibraryPaneOpen: true,
    }),
    { kind: "skillLibrary" }
  );
});

test("canvas resource pane replaces github deployment after a canvas resource request", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      githubDeploymentPaneOpen: true,
      preferredEntry: "resource",
      resourcePaneOpen: true,
    }),
    { kind: "resource" }
  );
});

test("canvas resource pane is active when no replacement pane is requested", () => {
  assert.deepEqual(
    resolveProjectCanvasSidePaneEntry({
      githubDeploymentPaneOpen: false,
      resourcePaneOpen: true,
    }),
    { kind: "resource" }
  );
});

test("canvas side pane is absent when no pane is requested", () => {
  assert.equal(
    resolveProjectCanvasSidePaneEntry({
      githubDeploymentPaneOpen: false,
      resourcePaneOpen: false,
    }),
    null
  );
});

test("canvas side pane slot renders the replacement pane while both candidates exist", () => {
  const entry = resolveProjectCanvasSidePaneEntry({
    githubDeploymentPaneOpen: true,
    resourcePaneOpen: true,
  });

  const html = renderToStaticMarkup(
    createElement(ProjectCanvasSidePaneSlot, {
      entry,
      databaseDeploymentPane: createElement(
        "aside",
        null,
        "Database deployment"
      ),
      dockerDeploymentPane: createElement("aside", null, "Docker deployment"),
      githubDeploymentPane: createElement("aside", null, "GitHub deployment"),
      resourcePane: createElement("aside", null, "Resource settings"),
      skillLibraryPane: createElement("aside", null, "Skill library"),
    })
  );

  assert.match(html, GITHUB_DEPLOYMENT_RE);
  assert.doesNotMatch(html, DATABASE_DEPLOYMENT_RE);
  assert.doesNotMatch(html, DOCKER_DEPLOYMENT_RE);
  assert.doesNotMatch(html, RESOURCE_SETTINGS_RE);
  assert.doesNotMatch(html, SKILL_LIBRARY_RE);
});
