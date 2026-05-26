import assert from "node:assert/strict";
import { test } from "node:test";

import {
  projectCanvasEntryForAssistantIntent,
  projectListEntryForAssistantIntent,
} from "./surface-intents";

test("Project List translates assistant GitHub intent to GitHub direct project creation", () => {
  assert.deepEqual(projectListEntryForAssistantIntent({ type: "github" }), {
    entryMode: "githubDirect",
    kind: "projectCreation",
    placement: "reserved",
  });
});

test("Project List translates assistant database intent to database direct project creation", () => {
  assert.deepEqual(projectListEntryForAssistantIntent({ type: "database" }), {
    entryMode: "databaseDirect",
    kind: "projectCreation",
    placement: "reserved",
  });
});

test("Project Canvas translates assistant GitHub intent to deployment in the current Project", () => {
  assert.deepEqual(
    projectCanvasEntryForAssistantIntent(
      { type: "github" },
      { projectUid: "project-1" }
    ),
    {
      kind: "githubDeployment",
      placement: "overlay",
      projectUid: "project-1",
    }
  );
});

test("Project Canvas translates assistant database intent to deployment in the current Project", () => {
  assert.deepEqual(
    projectCanvasEntryForAssistantIntent(
      { type: "database" },
      { projectUid: "project-1" }
    ),
    {
      kind: "databaseDeployment",
      placement: "overlay",
      projectUid: "project-1",
    }
  );
});

test("Project Canvas ignores GitHub deployment without an existing Project context", () => {
  assert.equal(
    projectCanvasEntryForAssistantIntent(
      { type: "github" },
      { projectUid: "" }
    ),
    null
  );
});
