import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveGithubProjectDisplayName } from "./github-project-display-name";

test("GitHub project display name uses the repository segment of a full name", () => {
  assert.equal(
    deriveGithubProjectDisplayName({
      existingProjectDisplayNames: [],
      repository: { fullName: "acme/api", name: "ignored" },
    }),
    "api"
  );
});

test("GitHub project display name trims repository names and falls back to name", () => {
  assert.equal(
    deriveGithubProjectDisplayName({
      existingProjectDisplayNames: [],
      repository: { name: "  worker  " },
    }),
    "worker"
  );
});

test("GitHub project display name avoids case-insensitive repeated conflicts", () => {
  assert.equal(
    deriveGithubProjectDisplayName({
      existingProjectDisplayNames: ["API", "api-2", "api-3"],
      repository: { fullName: "acme/api", name: "api" },
    }),
    "api-4"
  );
});
