import assert from "node:assert/strict";
import { test } from "node:test";

import {
  initialProjectCreationPaneState,
  projectCreationPaneStateReducer,
} from "./project-creation-pane-state";

test("project creation pane open events reset the creator flow", () => {
  const firstOpen = projectCreationPaneStateReducer(
    initialProjectCreationPaneState,
    { type: "open" }
  );

  assert.equal(firstOpen.open, true);
  assert.equal(firstOpen.resetKey, 1);

  const reopenWhileOpen = projectCreationPaneStateReducer(firstOpen, {
    type: "open",
  });

  assert.equal(reopenWhileOpen.open, true);
  assert.equal(reopenWhileOpen.resetKey, 2);
});

test("project creation pane close hides the pane without mutating the next reset key", () => {
  const open = projectCreationPaneStateReducer(
    initialProjectCreationPaneState,
    { type: "open" }
  );
  const closed = projectCreationPaneStateReducer(open, { type: "close" });

  assert.equal(closed.open, false);
  assert.equal(closed.resetKey, open.resetKey);

  const reopened = projectCreationPaneStateReducer(closed, { type: "open" });

  assert.equal(reopened.open, true);
  assert.equal(reopened.resetKey, open.resetKey + 1);
});
