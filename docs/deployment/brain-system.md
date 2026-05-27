# brain-system Deployment Runbook

This document defines the deployment goal, resource boundary, bootstrap order, Helm release flow, rollback flow, and verification commands for the `brain-system` namespace.

The target state is not "some YAML files exist". The target state is: an engineer can start from an empty compatible Kubernetes cluster, install the platform dependencies, apply the SealAI control-plane resources, deploy the application workloads, verify health, and know which resources are safe to edit.

## Goal

`brain-system` is the production-like namespace for the `sealai` stack:

- `sealai-ui-staging`: Next.js product UI.
- `sealai-api-staging`: Go API service.
- `sealai-registry`: Next.js component registry.
- `whodb`: database inspection service used by DB access workflows.
- `brain-pg`: PostgreSQL database managed through KubeBlocks.

The deployment model has three layers:

| Layer | Source of truth | Examples | Edit policy |
| --- | --- | --- | --- |
| Platform bootstrap | Helm releases, CRDs, XRDs, Compositions, cluster add-ons | Crossplane, KubeBlocks, ingress-nginx, VictoriaMetrics, VictoriaLogs | Install or upgrade intentionally before app claims |
| Desired app/database resources | `example.crossplane.io/v1` claims and explicitly managed native resources | `AP` for UI/API/registry, `DB` for PostgreSQL, native `Deployment` for WhoDB | Edit these first |
| Generated/runtime resources | Controllers reconcile these from desired state | `Deployment`, `InstanceSet`, `Service`, `Ingress`, KubeBlocks `Cluster`, snapshot `ConfigMap` | Inspect/debug; do not treat as the main source unless it is explicitly native |

## Current Cluster Snapshot

Observed on `2026-05-26` with:

```bash
KUBECONFIG=/Users/jingyang/.kube/53-admin-config
NAMESPACE=brain-system
```

Namespace:

- `brain-system` exists and is `Active`.

Platform components observed:

| Component | Namespace | Observed version/image |
| --- | --- | --- |
| Crossplane | `crossplane-system` | Helm `crossplane-2.2.0`, image `xpkg.crossplane.io/crossplane/crossplane:v2.2.0` |
| Crossplane provider-kubernetes | `crossplane-system` | `xpkg.crossplane.io/crossplane-contrib/provider-kubernetes:v1.0.0` |
| Crossplane function-go-templating | `crossplane-system` | `xpkg.crossplane.io/crossplane-contrib/function-go-templating:v0.9.2` |
| KubeBlocks | `kb-system` | Helm `kubeblocks-0.9.3`, manager image `wallykk/kubeblocks:fix-backup-method-v1` |
| ingress-nginx | `ingress-nginx` | `IngressClass` named `nginx` |
| VictoriaMetrics | `vm` | Helm `victoria-metrics-k8s-stack-0.59.3`, app version `v1.124.0` |
| VictoriaLogs | `vlc`, `audit-system` | `victoria-logs-cluster` releases |

Application resources observed:

| Resource | Source kind | Runtime resource | Image | Port | Public endpoint |
| --- | --- | --- | --- | --- | --- |
| `sealai-ui-staging` | `AP` | `Deployment` + `Service` + `Ingress` | `aimerite/sealai-ui:latest` | `3000` | `https://sealai-ui-staging-46c64e80a2.192.168.12.53.nip.io/`, `https://sealai-ui-staging-548622b2e3.192.168.12.53.nip.io/` |
| `sealai-api-staging` | `AP` | `Deployment` + `Service` + `Ingress` | `aimerite/sealai-api:latest` | `9000` | `https://sealai-api-staging-ee6a39ecd0.192.168.12.53.nip.io/`, `https://sealai-api-staging-722543b3df.192.168.12.53.nip.io/` |
| `sealai-registry` | `AP` | `Deployment` + `Service` + `Ingress` | `puddlecat/sealai-registry:latest` | `10000` | `https://sealai-registry-b31c3bc5ac.192.168.12.53.nip.io/` |
| `whodb` | Native Kubernetes | `Deployment` + `Service` | `docker.io/aimerite/whodb:whodb-integration-2026.509.021621` | `11000` | Internal service only |
| `brain-pg` | `DB` | KubeBlocks `Cluster` + `InstanceSet` + services | KubeBlocks PostgreSQL `16.4.0` | `5432` | Optional NodePort export |

Important current-state detail:

- The live `sealai-*` APs use `aps-deployment-ingress-go-templating`.
- The cluster also has an older `aps-brain-system-go-templating` Composition, but the current `sealai-ui-staging`, `sealai-api-staging`, and `sealai-registry` claims do not use it. Treat it as historical unless a future migration explicitly adopts it.
- `brain-pg` reports `phase=Running`, but the Crossplane `Ready` condition can be `False` because some observed/generated support resources are still considered unready. Use the KubeBlocks cluster, pod, and service health before declaring a database outage.

## Resource Boundary

### Crossplane-managed AP workloads

The UI, API, and registry are desired through `example.crossplane.io/v1`, kind `AP`.

Primary desired resources:

```bash
kubectl -n brain-system get ap
kubectl -n brain-system get ap sealai-ui-staging -o yaml
kubectl -n brain-system get ap sealai-api-staging -o yaml
kubectl -n brain-system get ap sealai-registry -o yaml
```

Generated resources:

- `Deployment`: same name as the AP.
- `Service`: `{ap-name}-service`.
- `Ingress`: `{ap-name}-ingress`.
- snapshot `ConfigMap`: `{ap-name}-config-snapshot-*`.
- backup `ConfigMap`: `{ap-name}-config-backup`.
- `EntryPoint` objects through provider-kubernetes.
- short-lived config snapshot jobs and RBAC resources.

Edit AP fields for desired changes:

- `spec.input.image`
- `spec.input.imagePullPolicy`
- `spec.input.network.privatePort`
- `spec.input.network.platformAddresses`
- `spec.input.env`
- `spec.input.probes`
- `spec.resource.requests`
- `spec.resource.limits`
- `spec.resource.replicaStrategy` or legacy `spec.resource.replicas`
- `spec.paused`
- `spec.restartRequest`

Do not patch the generated `Deployment` or `Ingress` as a durable change. Crossplane can overwrite it on the next reconcile.

For a one-off cluster hostname override, patch the generated `Ingress` only after pausing that AP's Crossplane reconcile. This is an operational override for the live cluster, not part of the Helm release values.

### Crossplane-managed DB workload

PostgreSQL is desired through `example.crossplane.io/v1`, kind `DB`.

Primary desired resource:

```bash
kubectl -n brain-system get db brain-pg -o yaml
```

Generated resources:

- KubeBlocks `Cluster`: `brain-pg`.
- KubeBlocks `InstanceSet`: `brain-pg-postgresql`.
- services:
  - `brain-pg-postgresql`
  - `brain-pg-postgresql-headless`
  - `brain-pg-export` when `spec.exposeNodePort=true`
- connection secret: `brain-pg-conn-credential`.
- KubeBlocks backup cron jobs and internal config maps.

Durable DB changes should go through `DB` fields such as:

- `spec.engine`
- `spec.quota`
- `spec.replicas`
- `spec.paused`
- `spec.restartRequest`
- `spec.storageSize`
- `spec.storageClassName`
- `spec.terminationPolicy`
- `spec.exposeNodePort`
- `spec.scheduledBackup`
- `spec.restoreFromBackup`

Do not edit the generated InstanceSet or KubeBlocks internal config maps as the main source of truth.

### Native WhoDB workload

WhoDB is currently a native Kubernetes deployment, not an AP claim.

Primary resources:

```bash
kubectl -n brain-system get deploy whodb -o yaml
kubectl -n brain-system get svc whodb -o yaml
```

Safe durable changes:

- image
- environment variables
- resource requests and limits
- probes
- service port

WhoDB is intentionally documented as native until it is explicitly migrated to an AP claim.

## Repository Sources

The repo already contains most platform-level Crossplane resources:

| Purpose | Path |
| --- | --- |
| AP XRD | `packages/crossplane/public/service/ap/ap.yaml` |
| Generic AP composition | `packages/crossplane/public/service/ap/deployments/aps-deployment-ingress-go-templating.yaml` |
| AP backup cleanup support | `packages/crossplane/public/service/ap/deployments/ap-backup-cleanup-rbac.yaml`, `packages/crossplane/public/service/ap/deployments/ap-config-backup-cleanup-cronjob.yaml` |
| DB XRD | `packages/crossplane/public/service/db/db.yaml` |
| PostgreSQL DB composition | `packages/crossplane/public/service/db/dbs-postgresql-kubeblocks-go-templating.yaml` |
| EntryPoint XRD/composition | `packages/crossplane/public/service/entrypoint/entrypoint.yaml`, `packages/crossplane/public/service/entrypoint/entrypoints-minimal-composition.yaml` |
| Project XRD/composition | `packages/crossplane/public/service/project/project.yaml`, `packages/crossplane/public/service/project/project-instance-composition.yaml` |

The repo also contains Dockerfiles for deployable app images:

| App | Dockerfile | Published image currently used |
| --- | --- | --- |
| UI | `apps/ui/Dockerfile` | `aimerite/sealai-ui` |
| API | `apps/api/Dockerfile` | `aimerite/sealai-api` |
| Registry | `apps/registry/Dockerfile` | `puddlecat/sealai-registry` |

The preferred deployable `brain-system` configuration is the Helm chart:

| Purpose | Path |
| --- | --- |
| Helm chart entrypoint | `charts/brain-system/Chart.yaml` |
| Default values | `charts/brain-system/values.yaml` |
| Private values template | `charts/brain-system/values.local.example.yaml` |
| Chart README | `charts/brain-system/README.md` |

The raw manifest reference lives under `deploy/brain-system/`:

| Purpose | Path |
| --- | --- |
| Application apply entrypoint | `deploy/brain-system/kustomization.yaml` |
| Namespace | `deploy/brain-system/namespace.yaml` |
| PostgreSQL DB claim | `deploy/brain-system/database/brain-pg.yaml` |
| UI AP claim | `deploy/brain-system/apps/sealai-ui-staging.yaml` |
| API AP claim | `deploy/brain-system/apps/sealai-api-staging.yaml` |
| Registry AP claim | `deploy/brain-system/apps/sealai-registry.yaml` |
| WhoDB native resources | `deploy/brain-system/apps/whodb.yaml` |
| Platform Crossplane resource list | `deploy/brain-system/platform/resources.txt` |
| Secret examples | `deploy/brain-system/secrets/*.example.yaml` |

`cd.sh` can create a Git tag/release and build/push Docker images. It does not deploy the image into Kubernetes.

## Bootstrap From Empty Cluster

Use this sequence for a cluster that does not already have the platform installed.

### 1. Configure access

```bash
export KUBECONFIG=/path/to/admin-kubeconfig
export NAMESPACE=brain-system
export REGION_DOMAIN=192.168.10.189.nip.io
```

The current operational kubeconfig path on this machine is:

```bash
export KUBECONFIG=/Users/jingyang/.kube/192.168.10.189-admin-config
```

### 2. Install platform controllers

Install equivalent releases for:

- Crossplane `2.2.0`.
- provider-kubernetes `1.0.0`.
- function-go-templating `0.9.2`.
- KubeBlocks `0.9.3` with PostgreSQL cluster definitions and versions.
- ingress-nginx with `IngressClass` named `nginx`.
- VictoriaMetrics and VictoriaLogs if API metrics/log endpoints are required.

On an existing reference cluster, capture installed Helm values before recreating the environment for components that are managed by Helm:

```bash
helm -n crossplane-system get values crossplane -o yaml
helm -n kb-system get values kubeblocks -o yaml
helm -n vm get values vm-stack -o yaml
helm -n vlc get values sys-vlc -o yaml
helm -n vlc get values usr-vlc -o yaml
```

Then install or upgrade equivalent releases in the target cluster. For components not shown as Helm releases, such as the currently observed `ingress-nginx`, capture the live manifest or platform installer source from the cluster owner instead of inventing a chart source during an incident.

Verify:

```bash
kubectl get ns crossplane-system kb-system ingress-nginx
kubectl -n crossplane-system get deploy
kubectl -n kb-system get deploy
kubectl get ingressclass nginx
kubectl get clusterdefinition postgresql
kubectl get clusterversion postgresql-16.4.0
```

### 3. Install Crossplane packages

Verify Crossplane packages:

```bash
kubectl get function.pkg.crossplane.io
kubectl get provider.pkg.crossplane.io
kubectl get clusterproviderconfig.kubernetes.m.crossplane.io
```

Expected packages:

- `crossplane-contrib-function-go-templating`
- `provider-kubernetes`
- `ClusterProviderConfig/default`

The AP and DB compositions depend on these packages.

### 4. Apply XRDs and compositions

Apply platform package, RBAC, XRD, and Composition resources from this repo:

```bash
xargs -I{} kubectl apply -f {} < deploy/brain-system/platform/resources.txt
```

Verify:

```bash
kubectl get xrd | grep -E 'aps.example.crossplane.io|dbs.example.crossplane.io|entrypoints.example.crossplane.io|projects.example.crossplane.io'
kubectl get composition aps-deployment-ingress-go-templating
kubectl get composition dbs-postgresql-kubeblocks-go-templating
```

### 5. Prepare private Helm values

Create a private values file outside the repo:

```bash
cp charts/brain-system/values.local.example.yaml /tmp/brain-system.values.yaml
```

Edit `/tmp/brain-system.values.yaml`.

Generate `api.env.ENCODED_ADMIN_KUBECONFIG` from the target kubeconfig:

```bash
node -e 'console.log(encodeURIComponent(require("fs").readFileSync(process.env.KUBECONFIG, "utf8")))'
```

The chart can create the app environment Secrets directly from values. If you want to manage Secrets outside Helm, set:

```yaml
secrets:
  create: false
  apiName: sealai-api-staging-env
  uiName: sealai-ui-staging-env
```

Then create those Secrets yourself before installing the AP resources.

The AP composition currently references `imagePullSecrets: [{name: ghcr-cred}]`. On a new cluster, keep this in your private values unless the Secret already exists:

```yaml
imagePullSecret:
  create: true
  name: ghcr-cred
  dockerConfigJson: '{"auths":{}}'
```

Secret keys currently expected:

| Secret | Keys |
| --- | --- |
| `sealai-api-staging-env` | `VMSELECT_URL`, `VLSELECT_URL`, `ENCODED_ADMIN_KUBECONFIG`, `WHODB_URL` |
| `sealai-ui-staging-env` | `API_URL`, `DATABASE_URL`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `SYSTEM_OPENAI_API_KEY`, `SYSTEM_OPENAI_API_BASE_URL`, `FREE_CHAT_TURNS`, `AI_PROXY_TOKEN_NAME`, `SEALOS_HOST`, `DEVBOX_TOKEN`, `DEVBOX_JWT_SIGNING_KEY`, `DEVBOX_RUNTIME_IMAGE`, `DEVBOX_ARCHIVE_AFTER_PAUSE_TIME`, `DEVBOX_JWT_TTL_SECONDS` |
| `brain-pg-conn-credential` | Generated by KubeBlocks/Crossplane; use it to compose `DATABASE_URL` |

Use `SYSTEM_OPENAI_API_KEY` and `SYSTEM_OPENAI_API_BASE_URL` for platform-paid free turns in every environment. User-billed turns use the Sealos AI proxy token path controlled by `AI_PROXY_TOKEN_NAME`.

### 6. Install or upgrade with Helm

If `ui.env.DATABASE_URL` is already known, install everything in one command:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n "${NAMESPACE}" \
  --create-namespace \
  -f /tmp/brain-system.values.yaml
```

For a brand-new cluster where the DB password does not exist yet, install DB/API/registry/WhoDB first and hold UI:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n "${NAMESPACE}" \
  --create-namespace \
  -f /tmp/brain-system.values.yaml \
  --set ui.enabled=false
```

Wait for the database Secret:

```bash
kubectl -n "${NAMESPACE}" get db brain-pg
kubectl -n "${NAMESPACE}" get cluster.apps.kubeblocks.io brain-pg
kubectl -n "${NAMESPACE}" wait pod/brain-pg-postgresql-0 --for=condition=Ready --timeout=10m
kubectl -n "${NAMESPACE}" get secret brain-pg-conn-credential
```

Use the generated password to fill `ui.env.DATABASE_URL` in `/tmp/brain-system.values.yaml`; do not copy live passwords into Git.

Then enable UI:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n "${NAMESPACE}" \
  --create-namespace \
  -f /tmp/brain-system.values.yaml
```

Wait for application resources:

```bash
kubectl -n "${NAMESPACE}" wait ap/sealai-ui-staging --for=condition=Ready --timeout=10m
kubectl -n "${NAMESPACE}" wait ap/sealai-api-staging --for=condition=Ready --timeout=10m
kubectl -n "${NAMESPACE}" wait ap/sealai-registry --for=condition=Ready --timeout=10m

kubectl -n "${NAMESPACE}" rollout status deploy/whodb --timeout=5m
```

## Release Flow

### Build and publish image

From repo root:

```bash
bun typecheck
bun check

./cd.sh ui "release notes"
./cd.sh api "release notes"
./cd.sh registry "release notes"
```

`cd.sh` behavior:

- validates project name by checking `apps/*/Dockerfile`
- creates a date-based Git tag such as `ui-YYYYMMDD.N`
- creates a GitHub release
- builds a Linux amd64 image
- pushes both `latest` and immutable date version tags

Prefer deploying the immutable tag instead of `latest`.

### Deploy a new image tag

Patch the AP desired state, not the generated Deployment:

```bash
kubectl -n "${NAMESPACE}" patch ap sealai-ui-staging --type merge \
  -p '{"spec":{"input":{"image":"aimerite/sealai-ui:YYYYMMDD.N"}}}'

kubectl -n "${NAMESPACE}" patch ap sealai-api-staging --type merge \
  -p '{"spec":{"input":{"image":"aimerite/sealai-api:YYYYMMDD.N"}}}'

kubectl -n "${NAMESPACE}" patch ap sealai-registry --type merge \
  -p '{"spec":{"input":{"image":"puddlecat/sealai-registry:YYYYMMDD.N"}}}'
```

Then wait:

```bash
kubectl -n "${NAMESPACE}" wait ap/sealai-ui-staging --for=condition=Ready --timeout=10m
kubectl -n "${NAMESPACE}" rollout status deploy/sealai-ui-staging --timeout=10m
```

If `latest` must be reused, increment `spec.restartRequest` to force a rollout:

```bash
kubectl -n "${NAMESPACE}" patch ap sealai-ui-staging --type merge \
  -p '{"spec":{"restartRequest":1}}'
```

Read the current value first and increment it; do not blindly reset it.

## Rollback

### AP rollback

Roll back by patching the AP image back to a known-good immutable tag:

```bash
kubectl -n "${NAMESPACE}" patch ap sealai-ui-staging --type merge \
  -p '{"spec":{"input":{"image":"aimerite/sealai-ui:PREVIOUS_TAG"}}}'

kubectl -n "${NAMESPACE}" rollout status deploy/sealai-ui-staging --timeout=10m
```

Do not rely on `kubectl rollout undo deployment/...` as the durable rollback. Crossplane can reconcile the Deployment back to the AP spec.

### DB rollback

Database rollback is not a normal app rollback. Use KubeBlocks backups or DB restore fields only after confirming:

- target backup name
- restore namespace
- restore policy
- whether the restore is in-place or a new DB claim
- expected data loss window

Never change `terminationPolicy` to `WipeOut` or delete `brain-pg` during routine app rollback.

### WhoDB rollback

WhoDB is native Kubernetes, so Deployment rollback is acceptable:

```bash
kubectl -n "${NAMESPACE}" rollout history deploy/whodb
kubectl -n "${NAMESPACE}" rollout undo deploy/whodb --to-revision=<revision>
kubectl -n "${NAMESPACE}" rollout status deploy/whodb --timeout=5m
```

## Health Checks

Cluster object checks:

```bash
kubectl -n "${NAMESPACE}" get ap,db
kubectl -n "${NAMESPACE}" get deploy,instanceset,pod,svc,ingress -o wide
kubectl -n "${NAMESPACE}" describe ap sealai-ui-staging
kubectl -n "${NAMESPACE}" describe ap sealai-api-staging
kubectl -n "${NAMESPACE}" describe db brain-pg
```

Pod checks:

```bash
kubectl -n "${NAMESPACE}" logs deploy/sealai-api-staging --tail=200
kubectl -n "${NAMESPACE}" logs deploy/sealai-ui-staging --tail=200
kubectl -n "${NAMESPACE}" logs deploy/sealai-registry --tail=200
kubectl -n "${NAMESPACE}" logs deploy/whodb --tail=200
```

HTTP checks:

```bash
curl -kfsS https://sealai-api-staging-ee6a39ecd0.192.168.12.53.nip.io/health
curl -kfsS https://sealai-ui-staging-46c64e80a2.192.168.12.53.nip.io/
curl -kfsS https://sealai-registry-b31c3bc5ac.192.168.12.53.nip.io/
```

Internal service checks:

```bash
kubectl -n "${NAMESPACE}" run curl-check --rm -i --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -fsS http://sealai-api-staging-service.brain-system.svc:9000/health

kubectl -n "${NAMESPACE}" run curl-check --rm -i --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -fsS http://whodb.brain-system.svc:11000/health
```

DB checks without printing credentials:

```bash
kubectl -n "${NAMESPACE}" get secret brain-pg-conn-credential \
  -o go-template='{{range $k,$v := .data}}{{$k}}{{"\n"}}{{end}}'

kubectl -n "${NAMESPACE}" get cluster.apps.kubeblocks.io brain-pg
kubectl -n "${NAMESPACE}" get pod brain-pg-postgresql-0
```

## Troubleshooting

### AP is not Ready

Start with:

```bash
kubectl -n "${NAMESPACE}" describe ap <name>
kubectl -n "${NAMESPACE}" get events --sort-by=.lastTimestamp | tail -50
kubectl -n "${NAMESPACE}" get deploy,svc,ingress | grep <name>
```

Common causes:

- referenced Secret key is missing
- image tag does not exist or registry auth failed
- probe path or port does not match the app
- platform address or ingress generation failed
- Crossplane provider-kubernetes cannot apply generated objects

### Deployment is manually patched but reverts

The AP is the desired source. Patch `ap/<name>` instead of `deployment/<name>`.

### DB is Running but DB Ready is False

Check both Crossplane and KubeBlocks:

```bash
kubectl -n "${NAMESPACE}" describe db brain-pg
kubectl -n "${NAMESPACE}" get cluster.apps.kubeblocks.io brain-pg -o yaml
kubectl -n "${NAMESPACE}" get pod -l app.kubernetes.io/instance=brain-pg
```

If the KubeBlocks cluster and pod are healthy, the `DB` Ready condition may be blocked by observed support resources. Do not delete DB resources as the first response.

### Ingress host is not reachable

Check:

```bash
kubectl get ingressclass nginx
kubectl -n ingress-nginx get svc ingress-nginx-controller
kubectl -n "${NAMESPACE}" get ingress <name> -o yaml
```

The current hosts use the `192.168.12.53.nip.io` pattern and TLS secret `wildcard-cert`. If the cluster IP or wildcard certificate changes, AP platform addresses and ingress TLS configuration must be regenerated or updated through the platform composition.

## Maintenance Rules

- Commit documentation and desired-state changes before applying them to production-like clusters.
- Use immutable image tags for deploys; avoid relying on `latest` for rollback.
- Never commit real Secret values, kubeconfigs, database passwords, GitHub OAuth secrets, Devbox tokens/signing keys, or OpenAI/API keys.
- Patch AP/DB claims for durable changes; inspect generated resources for debugging.
- Treat `brain-pg` as stateful. Any storage, backup, restore, or termination policy change needs a separate review.
- Before claiming a deployment is done, verify both controller-level readiness (`AP`/`DB`) and runtime readiness (`Deployment`/`InstanceSet`/HTTP checks).

## Completion Checklist

Use this checklist when rebuilding or auditing `brain-system`:

- [ ] Admin kubeconfig points to the intended cluster.
- [ ] `crossplane-system`, `kb-system`, and `ingress-nginx` exist.
- [ ] Crossplane, provider-kubernetes, and function-go-templating are installed and healthy.
- [ ] KubeBlocks PostgreSQL definitions and version `postgresql-16.4.0` are available.
- [ ] `IngressClass/nginx` exists.
- [ ] AP/DB XRDs and required compositions are installed.
- [ ] `brain-system` namespace exists.
- [ ] `sealai-api-staging-env` and `sealai-ui-staging-env` exist with required keys.
- [ ] `brain-pg` DB claim exists and KubeBlocks PostgreSQL pod is running.
- [ ] UI, API, and registry AP claims are Ready.
- [ ] UI, API, registry, and WhoDB Deployments are available.
- [ ] Public API `/health` returns success.
- [ ] UI and registry public URLs return success.
- [ ] Rollback image tags are known before deploying a new app version.
