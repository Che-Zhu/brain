import assert from "node:assert/strict";
import { test } from "node:test";

import { routingDomainFromKubeconfig } from "./kubeconfig-routing-domain";

test("routingDomainFromKubeconfig derives host from current cluster server", () => {
  const kubeconfig = `
apiVersion: v1
kind: Config
current-context: dev
contexts:
  - name: dev
    context:
      cluster: local
clusters:
  - name: other
    cluster:
      server: https://other.example.com:6443
  - name: local
    cluster:
      server: https://192.168.12.53.nip.io:6443
`;

  assert.equal(routingDomainFromKubeconfig(kubeconfig), "192.168.12.53.nip.io");
});

test("routingDomainFromKubeconfig ignores invalid Kubernetes label values", () => {
  const kubeconfig = `
apiVersion: v1
kind: Config
clusters:
  - name: local
    cluster:
      server: https://-bad.example.com:6443
`;

  assert.equal(routingDomainFromKubeconfig(kubeconfig), "");
});
