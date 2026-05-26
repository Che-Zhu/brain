import assert from "node:assert/strict";
import { test } from "node:test";
import YAML from "yaml";

import { renderDbDeploymentYaml } from "./db-deployment-yaml";

test("renderDbDeploymentYaml writes deployment settings into a DB claim", () => {
  const out = YAML.parse(
    renderDbDeploymentYaml({
      compositionName: "dbs-mysql-kubeblocks-go-templating",
      engine: "mysql",
      name: "project-a-db",
      namespace: "ns-admin",
      projectName: "project-a",
      quota: "s",
      replicas: 2,
    })
  );

  assert.equal(out.kind, "DB");
  assert.equal(out.metadata.name, "project-a-db");
  assert.equal(out.metadata.namespace, "ns-admin");
  assert.equal(out.spec.engine, "mysql");
  assert.equal(out.spec.quota, "s");
  assert.equal(out.spec.replicas, 2);
  assert.equal(out.spec.projectName, "project-a");
  assert.equal(out.spec.exposeNodePort, false);
  assert.equal(
    out.spec.crossplane.compositionRef.name,
    "dbs-mysql-kubeblocks-go-templating"
  );
});

test("renderDbDeploymentYaml strips public-only region labels from templates", () => {
  const out = YAML.parse(
    renderDbDeploymentYaml({
      compositionName: "dbs-postgresql-kubeblocks-go-templating",
      engine: "postgresql",
      name: "project-a-pg",
      namespace: "ns-admin",
      projectName: "project-a",
      quota: "xs",
      replicas: 12,
      template: `
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: template-name
  namespace: template-ns
  labels:
    region: 192.168.12.53.nip.io
    keep: yes
spec:
  crossplane:
    compositionRef:
      name: old
  engine: redis
  quota: l
`,
    })
  );

  assert.equal(out.metadata.name, "project-a-pg");
  assert.equal(out.metadata.namespace, "ns-admin");
  assert.equal(out.metadata.labels.region, undefined);
  assert.equal(out.metadata.labels.keep, "yes");
  assert.equal(out.spec.engine, "postgresql");
  assert.equal(out.spec.quota, "xs");
  assert.equal(out.spec.replicas, 10);
  assert.equal(
    out.spec.crossplane.compositionRef.name,
    "dbs-postgresql-kubeblocks-go-templating"
  );
});
