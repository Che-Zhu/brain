import assert from "node:assert/strict";
import { test } from "node:test";
import YAML from "yaml";

import { mergeProjectMetadataDisplayName } from "./project-yaml-metadata";

test("mergeProjectMetadataDisplayName writes displayName annotation", () => {
  const yaml = `
apiVersion: example.crossplane.io/v1
kind: Project
metadata:
  name: demo
  namespace: default
spec:
  public: false
`;

  const out = YAML.parse(
    mergeProjectMetadataDisplayName(yaml, "  Production API ")
  );

  assert.equal(out.metadata.annotations.displayName, "Production API");
  assert.equal(out.metadata.name, "demo");
});

test("mergeProjectMetadataDisplayName preserves existing annotations", () => {
  const yaml = `
apiVersion: example.crossplane.io/v1
kind: Project
metadata:
  name: demo
  annotations:
    owner: platform
`;

  const out = YAML.parse(
    mergeProjectMetadataDisplayName(yaml, "Production API")
  );

  assert.equal(out.metadata.annotations.owner, "platform");
  assert.equal(out.metadata.annotations.displayName, "Production API");
});
