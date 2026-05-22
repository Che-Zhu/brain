import assert from "node:assert/strict";
import { test } from "node:test";
import YAML from "yaml";

import { mergeApMetadataRegion } from "./ap-yaml-merge-project";

test("mergeApMetadataRegion adds region label to AP manifests", () => {
  const yaml = `
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: demo
  namespace: default
spec:
  input:
    image: nginx
`;

  const out = YAML.parse(mergeApMetadataRegion(yaml, "192.168.12.53.nip.io"));

  assert.equal(out.metadata.labels.region, "192.168.12.53.nip.io");
});

test("mergeApMetadataRegion replaces template region label", () => {
  const yaml = `
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: demo
  labels:
    region: custom.example.com
`;

  const out = YAML.parse(mergeApMetadataRegion(yaml, "192.168.12.53.nip.io"));

  assert.equal(out.metadata.labels.region, "192.168.12.53.nip.io");
});
