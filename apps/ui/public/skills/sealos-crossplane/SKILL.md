---
name: sealos-crossplane
description: >-
  Sealos Crossplane XRDs `AP` (`spec.input` + `spec.resource`; deploy via
  `aps-deployment-ingress-go-templating` or app-store **template** compositions),
  `Project` (group resources via
  `project-instance-go-templating`), and `DB` (provision a KubeBlocks database Cluster via one of
  four engine-specific compositions: postgresql / mysql / mongodb / redis), all
  `example.crossplane.io/v1`, namespaced. Lists every configurable spec field, a few valid claim
  examples, and the bash commands the chat Devbox runtime needs (kubectl on PATH) to pick the
  namespace and derive the ingress base host before applying.
  Use when authoring or applying AP/Project/DB manifests against a Kubernetes cluster.
---

# Sealos Crossplane — `AP`, `Project`, and `DB`

`AP`, `Project`, and `DB` are Sealos-specific Crossplane **XRDs** (Composite Resource Definitions)
in group `example.crossplane.io`, version `v1`, all namespaced. Each XRD has a default
**Composition** that turns a small claim YAML into real Kubernetes resources via an inline Go
template. Scope of this skill (other compositions exist on some clusters but are out of scope):

| Kind      | Default `compositionRef.name`                | Composes                                                        |
|-----------|----------------------------------------------|-----------------------------------------------------------------|
| `AP`      | `aps-deployment-ingress-go-templating`       | `Deployment`, Private Address `Service`, optional public `Ingress`/`EntryPoint`, plus a config-snapshot `ConfigMap` (+ rollback `Job`). |
| `AP` (template / app store) | one of `aps-<template>-go-templating` in `crossplane-system` | Same kinds as generic `AP`, plus template-specific Secrets/StatefulSets/etc. from the inline Go template. |
| `Project` | `project-instance-go-templating`             | One `app.sealos.io/v1 Instance` (Sealos UI grouping object).    |
| `DB`      | `dbs-postgresql-kubeblocks-go-templating` (default) — pick one of four per engine | `apps.kubeblocks.io/v1alpha1 Cluster`, `ServiceAccount` + `Role` + `RoleBinding`, an observe-only `Object` for KubeBlocks' auto-created conn-credential Secret, optional NodePort export Service, optional user-managed `Secret`. |

Need the raw XRD or Composition? Pull it from the cluster — do not invent it:

```bash
kubectl get xrd aps.example.crossplane.io -o yaml
kubectl get xrd projects.example.crossplane.io -o yaml
kubectl get xrd dbs.example.crossplane.io -o yaml
kubectl get composition aps-deployment-ingress-go-templating -o yaml
kubectl get composition project-instance-go-templating -o yaml
kubectl get compositions -l engine -o name           # the four dbs-*-kubeblocks-go-templating
# Template catalog (metadata only — see §1.1; do NOT -o yaml all templates)
kubectl get compositions.apiextensions.crossplane.io -n crossplane-system \
  -o go-template='{{range .items}}{{if eq (index .metadata.annotations "meta.crossplane.io/type") "template"}}{{.metadata.name}}{{"\n"}}{{end}}{{end}}' \
  | wc -l
kubectl explain ap.spec --api-version=example.crossplane.io/v1
kubectl explain ap.spec.input --api-version=example.crossplane.io/v1
kubectl explain ap.spec.resource --api-version=example.crossplane.io/v1
kubectl explain project.spec --api-version=example.crossplane.io/v1
kubectl explain db.spec --api-version=example.crossplane.io/v1
```

---

## 1. `AP` — deploy one Docker image

Composition behavior to know before you write a claim:

- The `Ingress` uses `ingressClassName: nginx` and TLS via `secretName: wildcard-cert` in the
  same namespace.
- **Spec layout:** workload settings live under **`spec.input`** (image, `network`, env, probes,
  `imagePullPolicy`); AP Replica Strategy and CPU/memory live under **`spec.resource`**
  (`replicaStrategy`, `requests`, `limits`). Top-level **`spec.projectName`**,
  **`spec.paused`**, **`spec.restartRequest`**, and **`spec.ingressAnnotations`** are not nested
  under `input`.
- **Network contract:** `spec.input.network.privatePort` is the App Listening Port targeted by
  the Private Address. Optional `spec.input.network.platformAddresses[]` entries request Platform
  Addresses; each entry has stable opaque `id` and target App Listening Port `port`.
- The composition derives platform hosts from the AP name, Platform Address ID, and routing domain
  carried by `metadata.labels.region`; do not set desired host or URL fields.
- APs without Public Addresses stay private-only: one Service and no Ingress or EntryPoint.
- The composed `Deployment`/`Service`/`Ingress`/`ConfigMap` ownerReference the `AP`. Composed
  child names: `Deployment={name}`, `Service={name}-service`,
  `Ingress={name}-ingress`, ConfigMap=`{name}-config-backup` (managed) and
  `{name}-config-snapshot-{hash}` (immutable rollback artifacts).

### `AP` configurable `spec` fields

| Field                            | Type                                        | Default     | Notes |
|----------------------------------|---------------------------------------------|-------------|-------|
| `crossplane.compositionRef.name` | string                                      | (XRD default) | Set to `aps-deployment-ingress-go-templating`. Omit to use the XRD default. |
| `name`                           | string                                      | `metadata.name` | Logical instance name for composed resources. |
| `projectName`                    | string                                      | —           | `Project` claim name in the same namespace (labels + `ownerReference`). |
| `input.image`                    | string                                      | —           | Container image. |
| `input.network.privatePort`      | integer                                     | —           | App Listening Port targeted by the Private Address. |
| `input.network.platformAddresses[]` | `[{ id, port }]`                         | `[]`        | Platform Address IDs routed to App Listening Ports through Ingress + EntryPoint. |
| `input.env[]`                    | `[{ name, value?, valueFrom? }]`            | `[]`        | Standard Kubernetes env shape. |
| `input.probes`                   | Kubernetes Probe map                        | none        | `startup` / `liveness` / `readiness`; no defaults. |
| `input.imagePullPolicy`          | `Always` \| `IfNotPresent` \| `Never`        | `Always`    | |
| `resource.replicaStrategy.type`  | `fixed` \| `elastic`                       | `fixed`     | AP Replica Strategy for new AP Settings writes. |
| `resource.replicaStrategy.fixed.replicas` | integer                           | `1`         | Fixed Replicas count (1-20). |
| `resource.replicaStrategy.elastic` | `{ minReplicas, maxReplicas, target }`    | `1`-`10`, CPU 80% | Elastic Scaling bounds and one active CPU or Memory target. |
| `resource.replicas`              | integer                                     | `1`         | Legacy Fixed Replicas fallback, used only when `resource.replicaStrategy` is absent. |
| `resource.requests` / `limits`   | `{ cpu, memory }`                           | `200m`/`204Mi` / `2000m`/`2048Mi` | Kubernetes quantities. |
| `paused`                         | boolean                                     | `false`     | Scale to 0 with SealOS pause annotations when true. |
| `restartRequest`                 | integer                                     | `0`         | Bump to roll pods via Composition. |
| `ingressAnnotations`             | `map[string]string`                         | `{}`        | Extra Ingress annotations. |
| `type`                           | `prelude`                                   | unset       | UI hint that the image may not be pullable yet. |
| `hooksYamlTmpl` / `webhookSecret` / `webhookListenPort` / `webhookExtraArgs` / `imagePullSecrets` | various | — | **Only** for composition `aps-webhook-go-templating` (GitHub webhooks), not the default deployment composition. |

### AP Replica Strategy

Use `resource.replicaStrategy` for all new AP Settings writes. Fixed Replicas uses
`resource.replicaStrategy.type: fixed` plus `fixed.replicas`; Elastic Scaling uses
`resource.replicaStrategy.type: elastic` plus `elastic.minReplicas`, `elastic.maxReplicas`, and
one target: CPU utilization percentage or Memory average value. Existing `resource.replicas`
claims remain valid only as a legacy Fixed Replicas fallback when `resource.replicaStrategy` is
absent. AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.

Representative examples live in `packages/crossplane/public/example/ap/`:
`ap-legacy-fixed-example.yaml`, `ap-fixed-replicas-example.yaml`,
`ap-cpu-elastic-example.yaml`, and `ap-memory-elastic-example.yaml`.

**Sealos app templates** (`*-composite.yaml` compositions) store Sealos template `inputs` under
`spec.input` (same object as deployment overrides). Generic deploys use
`aps-deployment-ingress-go-templating` with the fields above. See
[§1.1 Template AP (app store)](#11-template-ap-app-store) for discovery, drafting, and apply flow.

### 1.1 Template AP (app store)

Besides the generic deployment composition, the cluster may expose **many** Sealos app-store
templates — each is a Crossplane `Composition` in namespace **`crossplane-system`**, named
`aps-<template-slug>-go-templating` (RFC 1123 lowercase, e.g. `aps-fastgpt-go-templating`,
`aps-allinssl-go-templating`). They are tagged with:

| Where | Key | Value |
|-------|-----|-------|
| `metadata.annotations` | `meta.crossplane.io/type` | `template` |
| `metadata.labels` | `template` | Template id used in AP claims (e.g. `fastgpt`, `AllinSSL`) |
| `metadata.annotations` | `meta.crossplane.io/display-name` | Human title |
| `metadata.annotations` | `meta.crossplane.io/description` | Short blurb |
| `metadata.annotations` | `template/instance` | **Starter AP claim YAML** — same role as `meta.crossplane.io/template` on the generic deployment composition |

A template AP claim still uses kind **`AP`** and the same **`spec.input` + `spec.resource`**
layout. It selects the template composition via **`spec.crossplane.compositionSelector.matchLabels.template`**
(or explicit **`spec.crossplane.compositionRef.name`**) and sets **`spec.template`** to the same
label value. Template-specific parameters (passwords, API keys, host slugs, etc.) live under
**`spec.input`**; AP Replica Strategy and CPU/memory live under **`spec.resource`**.
Use `spec.resource.replicaStrategy` for new AP Replica Strategy writes; `spec.resource.replicas`
is only the legacy Fixed Replicas fallback.

#### Token cost warning — do not bulk-fetch templates

There are **100+** template compositions. Each full object includes a large inline Go-templating
pipeline. **Never** run `kubectl get compositions -n crossplane-system -o yaml` (or read every
`*-composite.yaml` in the repo) during discovery — it will consume a huge number of tokens and
slow the agent down for no benefit.

**Discovery (cheap):** list **names and partial metadata only** — enough to help the user pick an app:

```bash
kubectl get compositions.apiextensions.crossplane.io -n crossplane-system \
  -o go-template='{{range .items}}{{if eq (index .metadata.annotations "meta.crossplane.io/type") "template"}}{{.metadata.name}}{{"\t"}}{{index .metadata.labels "template"}}{{"\t"}}{{index .metadata.annotations "meta.crossplane.io/display-name"}}{{"\t"}}{{index .metadata.annotations "meta.crossplane.io/description"}}{{"\n"}}{{end}}{{end}}' \
  | column -t -s $'\t'
```

Filter further with `grep -i` on the output (e.g. `grep -i dify`). Optionally fetch
`meta.crossplane.io/readme` or `meta.crossplane.io/url` for **one** candidate via jsonpath — still
avoid pulling `spec.pipeline` until the template is chosen.

**Selection (one template only):** after the user (or you) picks a template, fetch **that**
composition's claim skeleton — not the full pipeline unless debugging:

```bash
TEMPLATE=aps-fastgpt-go-templating   # lowercase metadata.name
kubectl get composition "$TEMPLATE" -n crossplane-system \
  -o jsonpath='{.metadata.annotations.template/instance}{"\n"}'
```

Read comments inside `template/instance` (lines starting with `#`, or empty-string placeholders)
to learn **required vs optional** `spec.input` fields. If the annotation is missing, fall back to
`kubectl get composition "$TEMPLATE" -n crossplane-system -o yaml` for **that single object only**.

#### Drafting and asking for parameters

1. Start from **`template/instance`**: substitute `{{ name }}`, `{{ region }}`, `<your-namespace>`,
   and `<base-host>` with validated values ([§6.2](#62-pick-the-namespace), [§6.3](#63-derive-the-ingress-base-host)).
2. Set **`metadata.labels.region`** to **`BASE_HOST`** when using region-derived ingress hosts
   ([§1](#1-ap--deploy-one-docker-image)).
3. Fill **`spec.input`** with template-specific keys; keep **`spec.resource`** for replicas/requests/limits.
4. **Before apply:** if any required `spec.input` fields are unknown (empty defaults, commented
   `# (required)`, secrets, passwords, external URLs), **stop and ask the user**. Present them in a
   **markdown table** — do not invent production secrets:

   | Field (`spec.input…`) | Required | Description / notes |
   |-----------------------|----------|---------------------|
   | `rootPassword`        | yes      | Initial admin password |
   | `openaiApiKey`        | yes      | OpenAI-compatible API key |

5. Apply with the same flow as a generic AP ([§5](#5-apply-flow), [§6.4](#64-apply-and-watch)).

**Example** (structure only — values come from the chosen template's `template/instance`):

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: <your-app>
  namespace: <your-namespace>
  labels:
    region: <base-host>
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: fastgpt
  template: fastgpt
  name: <your-app>
  input:
    # template-specific keys from template/instance …
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: 100m
      memory: 102Mi
    limits:
      cpu: 1000m
      memory: 1024Mi
```

**Config backup / rollback:** the composition snapshots an *effective* spec into ConfigMap
`{name}-config-snapshot-{hash}` key `config.yaml` with top-level `name`, `namespace`, `input`,
`resource`, `projectName`, `paused`, `restartRequest`, `ingressAnnotations` (not flat `image` /
`replicas`). Roll back by re-applying those nested blocks onto a live AP claim.

`status` fields (read-only, useful when polling): `phase` (`Running` / `Progressing` /
`Failed` / `Degraded` / `Paused` / `Unknown`), `configVersionHash`, `network.privateAddress`,
`network.privatePort`, `network.publicAddresses[]`, `projectName`, `projectUid`, `conditions[]`.

**JSON merge patch** (API `PATCH /api/ap/v1alpha1/`): patch nested subtrees, e.g.
`{"spec":{"input":{"image":"nginx:1.27"}}}`,
`{"spec":{"resource":{"replicaStrategy":{"type":"fixed","fixed":{"replicas":2}}}}}`,
`{"spec":{"paused":true}}`. Replacing `spec.input.network.platformAddresses` or `spec.input.env`
requires sending the **full** desired array.

---

## 2. `Project` — group multiple `AP`s under one Sealos Instance

A `Project` claim is a thin pointer: it composes exactly one `app.sealos.io/v1 Instance` with
the same name and namespace, labelled for the Sealos UI. Other resources "belong" to a project
by **the AP (or DB) referencing it via `spec.projectName`**, not by being listed inside the
Project's own spec.

### `Project` configurable `spec` fields

| Field                            | Type    | Default | Notes |
|----------------------------------|---------|---------|-------|
| `crossplane.compositionRef.name` | string  | (XRD default) | Set to `project-instance-go-templating`. Omit to use the XRD default. |
| `public`                         | boolean | `false` | Becomes label `crossplane.io/project-public: "true"` / `"false"` on the composed Instance. |

The composed Instance picks up `cloud.sealos.io/deploy-on-sealos: {project-name}` and
`crossplane.io/project-uid: {project-uid}` automatically; you don't configure those.

---

## 3. `DB` — provision a KubeBlocks database Cluster

A `DB` claim wraps a single KubeBlocks `apps.kubeblocks.io/v1alpha1 Cluster` (plus its
ServiceAccount/Role/RoleBinding, an observe-only `Object` for the auto-created conn-credential
Secret, and optional NodePort export Service). One of four engine-specific compositions is
selected — they share the `DB` XRD but differ in cluster definition, version, KubeBlocks Service
shape, and connection-string format.

| `spec.engine` | `compositionRef.name`                          | KubeBlocks `clusterDefinitionRef` / `clusterVersionRef`         |
|---------------|------------------------------------------------|-----------------------------------------------------------------|
| `postgresql`  | `dbs-postgresql-kubeblocks-go-templating`      | `postgresql` / `postgresql-16.4.0`                              |
| `mysql`       | `dbs-mysql-kubeblocks-go-templating`           | `apecloud-mysql` / `ac-mysql-8.0.30-1` (ApeCloud MySQL)         |
| `mongodb`     | `dbs-mongodb-kubeblocks-go-templating`         | `mongodb` / `mongodb-6.0`                                       |
| `redis`       | `dbs-redis-kubeblocks-go-templating`           | `redis` / `redis-7.2.7` (+ `redis-sentinel-7` sidecar component)|

`spec.engine` is **not** auto-mapped to a composition. The XRD's `defaultCompositionRef.name` is
the **postgresql** composition, so a claim that sets `engine: mysql` without also setting
`crossplane.compositionRef.name: dbs-mysql-kubeblocks-go-templating` (or
`compositionSelector.matchLabels: { engine: mysql }`) will run the postgres template against a
mysql `clusterDefinitionRef` and produce an invalid Cluster. **Always pair `engine` with the
matching `compositionRef.name`.**

Composition behavior to know before you write a claim:

- All four compositions emit: `ServiceAccount`/`Role`/`RoleBinding` named `{name}-sa`, the
  KubeBlocks `Cluster` named `{name}`, and a `kubernetes.m.crossplane.io/v1alpha1 Object` that
  observes (Observe-only) the conn-credential Secret KubeBlocks creates. Composed children
  `ownerReference` the `DB`.
- When `spec.exposeNodePort: true`, a `NodePort` Service `{name}-export` is composed selecting
  the primary/leader workload. `nodePort` is omitted so the apiserver allocates a free port
  cluster-wide.
- When `spec.secretData` is set, a separate user-managed `Secret` named `spec.connectionSecretName`
  (default `{name}-connection`) is composed with base64-encoded values. This is **independent**
  of the KubeBlocks-managed conn-credential Secret (`{name}-conn-credential` for
  postgres/mysql/mongodb, `{name}-redis-account-default` for redis).
- `metadata.labels.region` does **not** rewrite hosts the way it does on `AP`. For `DB` it is only
  used to format `status.connectionStringPublic` as `…@dbconn.{region}:{nodePort}`. Set it to
  `BASE_HOST` ([§6.3](#63-derive-the-ingress-base-host)) **only** when `exposeNodePort: true` and
  you want a public URI; leave it unset for private-only databases.
- `spec.projectName` works exactly like on `AP`: the composition observes the named `Project`
  claim in the same namespace, SSA-patches the `DB` composite with
  `crossplane.io/project-name` + `crossplane.io/project-uid` labels and a `Project`
  `ownerReference`, and tags composed children with the same labels.

### `DB` configurable `spec` fields

| Field                            | Type                                        | Default        | Notes |
|----------------------------------|---------------------------------------------|----------------|-------|
| `crossplane.compositionRef.name` | string                                      | postgres composition (XRD default) | **Must match `engine`.** Use `compositionSelector.matchLabels: { engine: <engine> }` as an alternative. |
| `engine`                         | `postgresql` \| `mysql` \| `mongodb` \| `redis` | —          | **Required.** Drives `clusterDefinitionRef`/`clusterVersionRef` inside the Go template. Cannot be changed in place — delete and recreate to switch engines. |
| `quota`                          | `xs` \| `s` \| `m` \| `l`                   | `xs`           | Preset for CPU/memory/storage (see quota table). Individual `cpuRequest`/`memoryRequest`/`cpuLimit`/`memoryLimit`/`storageSize` override only the fields you set. |
| `replicas`                       | integer                                     | `1`            | Replica count of the **primary** component. (Redis sentinel component is fixed at 1 replica.) |
| `cpuRequest` / `cpuLimit`        | string (k8s quantity)                       | from quota     | |
| `memoryRequest` / `memoryLimit`  | string (k8s quantity)                       | from quota     | |
| `storageSize`                    | string                                      | from quota     | PVC request for the primary data volume. Redis sentinel volume is set separately by quota and is not exposed as a field. |
| `storageClassName`               | string                                      | cluster default | Applied to all volumeClaimTemplates. |
| `terminationPolicy`              | `Delete` \| `WipeOut`                       | `Delete`       | KubeBlocks `Cluster.spec.terminationPolicy`. Case-insensitive `Wipeout` is normalised to `WipeOut`. |
| `exposeNodePort`                 | boolean                                     | `false`        | Compose `{name}-export` NodePort Service for primary/leader. Required for `status.connectionStringPublic`. |
| `connectionSecretName`           | string                                      | `{name}-connection` | Name of the user-managed Secret composed from `spec.secretData`. Distinct from KubeBlocks' `{name}-conn-credential`. |
| `secretData`                     | `map[string]string`                         | unset          | When present, composition emits an Opaque `Secret` whose `data` values are base64-encoded from your raw strings. |
| `scheduledBackup`                | `{ cronExpression?, enabled?, retentionPeriod?, repoName? }` | engine defaults | Maps to `Cluster.spec.backup`. Engine defaults below. PostgreSQL's `repoName` is **hard-coded** to `backuprepo-s3`; `scheduledBackup.repoName` is ignored for postgres. |
| `restoreFromBackup`              | `{ backupName, namespace?, volumeRestorePolicy?, connectionPassword? }` | unset | Sets the `kubeblocks.io/restore-from-backup` annotation on the Cluster. `connectionPassword` is honoured **only** by MySQL (preserves original account password). |
| `projectName`                    | string                                      | —              | Name of a `Project` in the same namespace. Same semantics as on `AP`. |

#### Quota presets

Omitted requests/limits/storage are filled from this table. Format:
`requests.cpu/requests.memory → limits.cpu/limits.memory, primary storage`.

| engine        | `xs`                                          | `s`                                              | `m`                                            | `l`                                            |
|---------------|-----------------------------------------------|--------------------------------------------------|------------------------------------------------|------------------------------------------------|
| `postgresql`  | `250m`/`512Mi` → `500m`/`1Gi`, `3Gi`          | `500m`/`1Gi` → `1000m`/`2Gi`, `10Gi`             | `1000m`/`2Gi` → `2000m`/`4Gi`, `20Gi`          | `2000m`/`4Gi` → `4000m`/`8Gi`, `50Gi`          |
| `mysql`       | `100m`/`256Mi` → `500m`/`512Mi`, `3Gi`        | `250m`/`512Mi` → `1000m`/`1Gi`, `10Gi`           | `500m`/`1Gi` → `2000m`/`2Gi`, `20Gi`           | `1000m`/`2Gi` → `4000m`/`4Gi`, `50Gi`          |
| `mongodb`     | `250m`/`768Mi` → `1000m`/`1024Mi`, `3Gi`      | `500m`/`1Gi` → `1000m`/`2Gi`, `20Gi`             | `1000m`/`2Gi` → `2000m`/`4Gi`, `50Gi`          | `2000m`/`4Gi` → `4000m`/`8Gi`, `100Gi`         |
| `redis`       | `100m`/`512Mi` → `500m`/`768Mi`, `3Gi` + `1Gi` sentinel | `250m`/`1Gi` → `1000m`/`1536Mi`, `4Gi` + `2Gi` | `500m`/`2Gi` → `2000m`/`3Gi`, `10Gi` + `2Gi` | `1000m`/`4Gi` → `4000m`/`6Gi`, `20Gi` + `2Gi`  |

#### Scheduled-backup defaults

Fixed per engine; `scheduledBackup.{cronExpression,enabled,retentionPeriod,repoName}` overrides
each individually (except postgres `repoName`):

| engine        | cron           | method          | repo (default)        | retention |
|---------------|----------------|-----------------|-----------------------|-----------|
| `postgresql`  | `13 10 * * *`  | `pg-basebackup` | `backuprepo-s3` (fixed) | `14d`   |
| `mysql`       | `04 07 * * *`  | `xtrabackup`    | `backuprepo-minio`    | `14d`     |
| `mongodb`     | `30 07 * * *`  | `dump`          | `backuprepo-minio`    | `14d`     |
| `redis`       | `02 08 * * *`  | `datafile`      | `backuprepo-minio`    | `14d`     |

The named `BackupRepo` resource must exist on the cluster, otherwise backups fail to schedule.
Set `scheduledBackup: { enabled: false }` for clusters without one.

### KubeBlocks Services and connection strings

Composed/observed KubeBlocks Services per engine (also echoed in `status.kubeblocksServices`,
all `ClusterIP` unless noted; DNS name is `{svc}.{namespace}.svc`):

| engine        | Services |
|---------------|----------|
| `postgresql`  | `{name}-postgresql` (primary), `{name}-postgresql-headless` |
| `mysql`       | `{name}-mysql` (leader), `{name}-mysql-headless` |
| `mongodb`     | `{name}-mongodb`, `{name}-mongodb-headless`, `{name}-mongodb-mongodb` (primary RW), `{name}-mongodb-mongodb-ro` (secondary RO) |
| `redis`       | `{name}-redis-redis` (primary, port `6379`), `{name}-redis-headless`, `{name}-redis-sentinel-redis-sentinel`, `{name}-redis-sentinel-headless` |

KubeBlocks itself creates the conn-credential Secret in the claim namespace
(`{name}-conn-credential` for postgres/mysql/mongodb; `{name}-redis-account-default` for redis).
The composition observes it (Observe-only, never creates/updates), decodes
`username`/`password` (and `host`/`port` where available), and populates:

- `status.connectionStringPrivate` — in-cluster URI, e.g.
  - `postgresql://user:pw@{name}-postgresql.{ns}.svc:5432`
  - `mysql://user:pw@{name}-mysql.{ns}.svc:3306`
  - `mongodb://user:pw@{name}-mongodb.{ns}.svc:27017`
  - `redis://user:pw@{name}-redis-redis.{ns}.svc:6379`
- `status.connectionStringPublic` — **only emitted when both** `exposeNodePort: true` **and**
  `metadata.labels.region` is set. Format
  `{scheme}://user:pw@dbconn.{region}:{allocated-nodePort}`. PostgreSQL and MongoDB append
  `?directConnection=true`; MySQL and Redis use no query string.

`status` fields (read-only, useful when polling): `phase` (mirrors KubeBlocks
`Cluster.status.phase`: `Creating` / `Running` / `Failed` / `Deleting` / `Unknown`),
`observedReplicas`, `availableReplicas`, `kubeblocksServices[]`, `secretData` (echo of the
user-managed Secret, base64), `connectionStringPrivate`, `connectionStringPublic`,
`projectName`, `projectUid`, `conditions[]`.

### `DB` common gotchas

- **Connection strings appear late.** KubeBlocks creates `…-conn-credential` (or
  `…-redis-account-default`) only after the Cluster reaches `phase: Running`; until then
  `status.connectionStringPrivate` is empty. Poll
  `kubectl get db <name> -n <ns> -o jsonpath='{.status.connectionStringPrivate}'`.
- **`engine` is immutable.** Switching engines requires deleting the DB and recreating it.
- **PostgreSQL `scheduledBackup.repoName` is ignored** — the postgres composition hard-codes
  `backuprepo-s3`. To change repos for postgres backups, change the BackupRepo CR or use a
  one-off `Backup` CR.
- **MySQL ApeCloud uses `leader`, not `primary`.** The export Service selects
  `kubeblocks.io/role=leader`; expect that role label in your own selectors too.
- **Redis writes go to `{name}-redis-redis`** (the engine doubles the suffix), not
  `{name}-redis`. The headless Service is `{name}-redis-headless`; sentinel uses
  `{name}-redis-sentinel-redis-sentinel`.
- **`metadata.labels.region` is harmless when omitted** — it only affects
  `connectionStringPublic`. Unlike `AP`, you do not need to set it for a working in-cluster DB.
- **Restore is annotation-based.** `spec.restoreFromBackup` adds
  `kubeblocks.io/restore-from-backup` on the Cluster; the referenced Backup CR must exist in
  `restoreFromBackup.namespace` (defaults to the claim namespace).

---

## 4. Devbox runtime (chat agent)

The chat backend runs your `bash` calls inside a Sealos Devbox runtime with namespace Kubernetes
access enabled:

- `kubectl` must already be on `PATH` in the Devbox image.
- `bash`, `readFile`, `writeFile` tools all share the same runtime. Use `writeFile` to drop a
  manifest at e.g. `/tmp/ap.yaml`, then `bash` `kubectl apply -f /tmp/ap.yaml`.
- Standard GNU userland is available (`grep`, `sed`, `awk`, `find`, `curl`, coreutils).

You do **not** configure contexts or `KUBECONFIG` — the sandbox is already pointed at the
user's cluster. Read it to make decisions; never assume a value.

---

## 5. Apply flow

1. **Verify the cluster and that the platform is installed** ([§6.1](#61-verify-cluster-access)).
   Stop and report verbatim if any of these fail.
2. **Resolve `metadata.namespace`** ([§6.2](#62-pick-the-namespace)). Confirm
   `kubectl auth can-i create aps -n <ns>` (and the matching `projects` / `dbs` checks for whatever
   you are applying).
3. For an `AP`:
   - Nest image/network/env/probes under **`spec.input`** and replicas/requests/limits under
     **`spec.resource`** ([§1](#1-ap--deploy-one-docker-image)).
   - For public APs, set `spec.input.network.platformAddresses[]` with stable IDs like
     `pa_abc123`; the platform derives host and URL values.
   - **Template / app store:** discover templates via metadata-only listing in
     `crossplane-system` ([§1.1](#11-template-ap-app-store)); fetch **one** `template/instance`
     annotation; draft the claim; tabulate missing required `spec.input` fields and ask the user
     before apply.
4. For a `DB`:
   - Pick the matching `compositionRef.name` for `spec.engine` ([§3](#3-db--provision-a-kubeblocks-database-cluster)).
   - Set `metadata.labels.region: <base-host>` **only** if you also set `exposeNodePort: true`
     and want `connectionStringPublic` populated.
5. **Apply Project before AP/DB** when the claim sets `spec.projectName`, otherwise the
   `project-observe` step has nothing to find on the first reconcile.
6. **Apply, then watch readiness** ([§6.4](#64-apply-and-watch)).

---

## 6. Tips

### 6.1 Verify cluster access

```bash
kubectl version --client=true
kubectl config current-context
kubectl cluster-info
kubectl api-resources --api-group=example.crossplane.io   # expect: aps, projects, dbs
kubectl get composition aps-deployment-ingress-go-templating project-instance-go-templating
kubectl get compositions -l engine -o name                # the four dbs-*-kubeblocks-go-templating
```

If `api-resources` shows nothing under `example.crossplane.io`, the XRDs aren't installed and
this skill cannot be used — stop. If only some compositions are missing (e.g. no `dbs-*`),
DB claims cannot be applied even though the `dbs` XRD exists.

### 6.2 Pick the namespace

In order:

1. **User-supplied:** validate it.

   ```bash
   NS="<user-supplied>"
   kubectl get namespace "$NS"
   kubectl auth can-i create aps -n "$NS"
   kubectl auth can-i create projects -n "$NS"   # only if applying a Project
   kubectl auth can-i create dbs -n "$NS"        # only if applying a DB
   ```
2. **Kubeconfig context default:**

   ```bash
   kubectl config view --minify -o jsonpath='{..namespace}'
   ```

   If non-empty, use it and rerun the `auth can-i` checks.
3. **Otherwise list candidates and ask** — do not silently fall back to `default`.

   ```bash
   for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
     printf '%s\t%s\n' "$ns" "$(kubectl auth can-i create aps -n "$ns" 2>/dev/null)"
   done
   ```

### 6.3 Derive the ingress base host

On Sealos-style clusters the API-server hostname doubles as the ingress DNS base
(nip.io / sslip.io / wildcard A record). Parse it from the active context:

```bash
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
BASE_HOST=$(printf '%s' "$SERVER" | sed -E 's#^https?://##; s#/.*$##; s#:[0-9]+$##')
echo "$BASE_HOST"
```

For AP Public Addresses, set `metadata.labels.region` to this `BASE_HOST` and add
`spec.input.network.platformAddresses[]` entries with stable `pa_...` IDs. The platform derives
the concrete host and URL values.

For `DB`, `BASE_HOST` doubles as the value of `metadata.labels.region` **only when** you want a
public NodePort URI (`status.connectionStringPublic`). It is not used for host rewriting; for
in-cluster-only databases leave the label off.

If `$SERVER` is an internal IP that won't resolve publicly, ask the user what ingress base host
the platform exposes — don't guess.

#### Hostname shape and collision-proof slugs

- Typical Sealos kubeconfig server: `https://192.168.12.53.nip.io:6443` → `BASE_HOST` is
  `192.168.12.53.nip.io` (strip scheme, path, trailing `:6443`). The ingress hostname is always
  **`<slug>.<BASE_HOST>`**, e.g. `demo-app.192.168.12.53.nip.io`.
- **Do not** invent `*.example.com` unless the user gave you that real DNS zone; it will not
  resolve on-cluster.

**Avoid host collisions**: reusing bare names like `nginx-app` across delete/recreate or
parallel demos in the same namespace clashes on the same `rules[].host`. Append a short random
or time-based postfix to **`metadata.name` and** each Public Address host's left DNS label:

```bash
RAND=$(openssl rand -hex 3)
APP_SLUG="nginx-${RAND}"
# Use $APP_SLUG as metadata.name; host="${APP_SLUG}.${BASE_HOST}"
```

### 6.4 Apply and watch

```bash
NS="<your-namespace>"; NAME="<your-app-or-db>"
# Project first when AP/DB references it
kubectl apply -n "$NS" -f /tmp/project.yaml
kubectl apply -n "$NS" -f /tmp/ap.yaml     # or /tmp/db.yaml

# AP
kubectl get project,ap -n "$NS" -o wide
kubectl describe ap "$NAME" -n "$NS"
kubectl get deploy,svc,ingress -n "$NS" -l crossplane.io/composite="$NAME"
kubectl rollout status deploy/"$NAME" -n "$NS" --timeout=180s

# DB
kubectl get db -n "$NS" -o wide
kubectl describe db "$NAME" -n "$NS"
kubectl get cluster.apps.kubeblocks.io "$NAME" -n "$NS" -o wide
kubectl get svc,secret -n "$NS" -l crossplane.io/composite="$NAME"
kubectl get db "$NAME" -n "$NS" -o jsonpath='{.status.connectionStringPrivate}'; echo
```

If `describe ap` shows `SYNCED=False` or `READY=False`, read `status.conditions[*].message`
and the events on the composed Deployment for the actual failure (image pull, OOMKilled,
missing Secret, etc.). For `DB`, also check
`kubectl describe cluster.apps.kubeblocks.io "$NAME" -n "$NS"` — KubeBlocks surfaces
storage-provisioning, backup-repo, and image-pull errors there, not on the `DB` claim.

### 6.5 Common gotchas

- **Duplicate Platform Address IDs** are invalid. Keep
  `spec.input.network.platformAddresses[].id` values unique within the AP.
- **No `spec.input.network.privatePort`** means the default AP composition has no App Listening Port
  to render, so it does not create the Network Service.
- **No `spec.input.network.platformAddresses[]`** keeps the AP private-only: Service only, no Ingress
  or EntryPoint.
- **Changing `spec.input.image`** rolls the Deployment and stamps a new immutable
  `{name}-config-snapshot-{hash}` ConfigMap for rollback (effective snapshot uses nested `input` /
  `resource`).
- **`spec.paused: true`** scales the Deployment to 0 with SealOS pause annotations; resume with
  `spec.paused: false` (replica count comes from the active AP Replica Strategy, falling back to
  legacy `spec.resource.replicas` only when `spec.resource.replicaStrategy` is absent).
- **Deleting an AP** garbage-collects the Deployment/Service/Ingress/managed ConfigMap (they
  ownerReference the AP), but orphan config-snapshot ConfigMaps and their RBAC intentionally
  survive. Clean them up manually with
  `kubectl get cm -n "$NS" -l app.sealos.io/ap-uid=<uid>` if needed.
- **Deleting a Project** removes the Instance, but APs/DBs that referenced it keep dangling
  `crossplane.io/project-*` labels and ownerRef — delete the dependent claims first, or accept
  GC chaining.
- **Deleting a DB** uses KubeBlocks `terminationPolicy`: `Delete` (default) or `WipeOut` (see
  `packages/crossplane/public/service/db/db.yaml` / `kubectl explain db.spec`). `WipeOut` is a
  stronger teardown than `Delete`; exact
  resource cleanup depends on the KubeBlocks version on-cluster—confirm with
  `kubectl explain cluster.spec.terminationPolicy` if behaviour surprises you.
- **DB `connectionStringPublic` empty?** Confirm both `spec.exposeNodePort: true` and
  `metadata.labels.region: <BASE_HOST>`. Then re-check the NodePort has been allocated:
  `kubectl get svc "${NAME}-export" -n "$NS" -o jsonpath='{.spec.ports[0].nodePort}'`.

### 6.6 Troubleshooting: wrong host (e.g. `.example.com`), or `kubectl apply` says `unchanged`

1. **Compare claim vs composed Ingress** (traffic follows the Ingress, not your YAML file on disk):

   ```bash
   kubectl get ap "$NAME" -n "$NS" -o jsonpath='{.spec.input.network.platformAddresses}' ; echo
   kubectl get ingress "${NAME}-ingress" -n "$NS" -o jsonpath='{.spec.rules[*].host}' ; echo
   kubectl get ap "$NAME" -n "$NS" -o jsonpath='{.status.network.publicAddresses}' ; echo
   ```

2. **AP public hosts are derived:** the default composition uses the AP identity, Platform Address
   ID, and `metadata.labels.region`. If the Ingress shows a surprising host, inspect the live AP
   object and Crossplane reconcile status.

3. **`kubectl apply ... unchanged`**: the live **AP** object already matched your manifest. If
   you thought you changed the Platform Address request, re-check namespace/name,
   `kubectl get ap ... -o yaml`, and whether another controller (SSA field manager / webhook)
   resets `spec.input.network`.

4. **Stale Ingress after fixing `spec.input.network.platformAddresses`**: if the AP spec shows the
   new request but `kubectl get ingress` still shows an old one, inspect `kubectl describe ap` (sync/ready).
   Wait for reconcile, or apply a harmless metadata annotation bump to force a new pipeline
   pass; if still wedged, recreate the AP with a **new** `metadata.name` and a fresh host.

5. **UI / list APIs**: some stacks treat `placeholder.example.com` as a non-user-facing
   placeholder; bogus `example.com` hosts from an early apply may also confuse summaries until
   the Ingress actually updates. Trust `kubectl get ingress` for the live routing hostname.

---

## 7. Claim YAML examples

Replace `<your-namespace>`, `<your-app>`, `<your-project>`, `<your-db>`, `<base-host>`, `<owner>`,
`<repo>`, `<tag>` with values you've validated on the active cluster ([§6](#6-tips)).
**`<base-host>` must come from [§6.3](#63-derive-the-ingress-base-host)** (often a `*.nip.io` /
cluster-specific domain), never a made-up `example.com` zone. Prefer collision-proof `<your-app>`
labels (see hostname and collision notes under §6.3).

### 7.1 Minimal `AP` (public image, explicit host)

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: aps-deployment-ingress-go-templating
  name: <your-app>
  input:
    image: nginx:latest
    network:
      privatePort: 80
      platformAddresses:
        - id: pa_app001
          port: 80
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
```

### 7.2 `AP` attached to a `Project`, with explicit resources

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: aps-deployment-ingress-go-templating
  name: <your-app>
  projectName: <your-project>
  input:
    image: nginx:latest
    network:
      privatePort: 80
      platformAddresses:
        - id: pa_app001
          port: 80
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 500m
      memory: 1Gi
```

### 7.3 `AP` with multiple Public Addresses, env, probes, ingress annotations

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: aps-deployment-ingress-go-templating
  name: <your-app>
  input:
    image: ghcr.io/<owner>/<repo>:<tag>
    network:
      privatePort: 8080
      platformAddresses:
        - id: pa_app001
          port: 8080
        - id: pa_metrics
          port: 9090
    env:
      - name: LOG_LEVEL
        value: "info"
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: <your-app>-db
            key: password
    probes:
      readiness:
        httpGet: { path: /healthz, port: 8080 }
        initialDelaySeconds: 5
        periodSeconds: 10
      liveness:
        httpGet: { path: /livez, port: 8080 }
        initialDelaySeconds: 30
        periodSeconds: 30
  resource:
    replicas: 2
  ingressAnnotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```

### 7.4 Private-only `AP`

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: aps-deployment-ingress-go-templating
  name: <your-app>
  input:
    image: nginx:latest
    network:
      privatePort: 80
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
```

### 7.5 Minimal `Project`

```yaml
apiVersion: example.crossplane.io/v1
kind: Project
metadata:
  name: <your-project>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: project-instance-go-templating
  public: false
```

### 7.6 Minimal `DB` (PostgreSQL, in-cluster only)

```yaml
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: <your-db>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: dbs-postgresql-kubeblocks-go-templating
  engine: postgresql
  quota: xs
```

### 7.7 `DB` (MySQL) with NodePort export and public connection string

```yaml
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: <your-db>
  namespace: <your-namespace>
  labels:
    region: <base-host>            # required for status.connectionStringPublic
spec:
  crossplane:
    compositionRef:
      name: dbs-mysql-kubeblocks-go-templating
  engine: mysql
  quota: s
  exposeNodePort: true
```

### 7.8 `DB` (MongoDB) attached to a `Project`, with overrides and scheduled backup

```yaml
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: <your-db>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: dbs-mongodb-kubeblocks-go-templating
  engine: mongodb
  quota: m
  replicas: 3
  storageSize: 100Gi
  storageClassName: csi-fast
  projectName: <your-project>
  scheduledBackup:
    enabled: true
    cronExpression: "0 2 * * *"
    retentionPeriod: 30d
    repoName: backuprepo-minio
```

### 7.9 `DB` (Redis) restored from an existing backup

```yaml
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: <your-db>
  namespace: <your-namespace>
spec:
  crossplane:
    compositionRef:
      name: dbs-redis-kubeblocks-go-templating
  engine: redis
  quota: s
  restoreFromBackup:
    backupName: <existing-backup-name>
    # namespace: <backup-namespace>           # defaults to <your-namespace>
    # volumeRestorePolicy: Parallel
```
