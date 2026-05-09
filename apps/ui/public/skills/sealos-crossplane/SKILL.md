---
name: sealos-crossplane
description: >-
  Sealos Crossplane XRDs `AP` (deploy a Docker image as Deployment + Service + Ingress via
  `aps-deployment-ingress-go-templating`) and `Project` (group resources via
  `project-instance-go-templating`), both `example.crossplane.io/v1`, namespaced. Lists every
  configurable spec field, a few valid claim examples, and the bash commands the chat sandbox
  needs (KUBECONFIG=/tmp/kubeconfig, kubectl on PATH) to pick the namespace and derive the
  ingress base host before applying.
  Use when authoring or applying AP/Project manifests against a Kubernetes cluster.
---

# Sealos Crossplane — `AP` and `Project`

`AP` and `Project` are Sealos-specific Crossplane **XRDs** (Composite Resource Definitions) in
group `example.crossplane.io`, version `v1`, both namespaced. Each XRD has a default
**Composition** that turns a small claim YAML into real Kubernetes resources via an inline Go
template. Scope of this skill (other compositions exist on some clusters but are out of scope):

| Kind      | Default `compositionRef.name`            | Composes                                                        |
|-----------|------------------------------------------|-----------------------------------------------------------------|
| `AP`      | `aps-deployment-ingress-go-templating`   | `Deployment`, one `Service` per endpoint, one `Ingress`, plus a config-snapshot `ConfigMap` (+ rollback `Job`). |
| `Project` | `project-instance-go-templating`         | One `app.sealos.io/v1 Instance` (Sealos UI grouping object).    |

Need the raw XRD or Composition? Pull it from the cluster — do not invent it:

```bash
kubectl get xrd aps.example.crossplane.io -o yaml
kubectl get xrd projects.example.crossplane.io -o yaml
kubectl get composition aps-deployment-ingress-go-templating -o yaml
kubectl get composition project-instance-go-templating -o yaml
kubectl explain ap.spec --api-version=example.crossplane.io/v1
kubectl explain project.spec --api-version=example.crossplane.io/v1
```

---

## 1. `AP` — deploy one Docker image

Composition behavior to know before you write a claim:

- The `Ingress` uses `ingressClassName: nginx` and TLS via `secretName: wildcard-cert` in the
  same namespace.
- If `metadata.labels.region` is set, the composition **overwrites every**
  `spec.endpoints[].host` with `{metadata.name}-{slug6}.{region}` where `slug6` is the first
  6 hex chars of `sha256(name|namespace|uid)`. **That label must equal the ingress base host
  `BASE_HOST`** from the active kubeconfig cluster server ([§5.3](#53-derive-the-ingress-base-host)):
  read `kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'` (e.g. stdout
  `https://192.168.12.53.nip.io:6443`), strip scheme/path/trailing `:port` → **`192.168.12.53.nip.io`**,
  and set `region` to **that hostname only**—not the raw `https://…:6443` URL and not an invented zone.
  Either use `region` and let it compute hosts, **or** set explicit `endpoints[].host` and omit
  `region`. Don't mix.
- **If `metadata.labels.region` is omitted**, the composition **does not** replace your hosts and
  **does not** auto-fill `BASE_HOST` or default to `*.example.com`. Ingress `rules[].host` is taken
  **verbatim** from `spec.endpoints[].host` (the template only overwrites endpoints when `region` is
  set; see `packages/crossplane/public/service/ap/aps-deployment-ingress-go-templating.yaml` in this
  repo). So a live Ingress ending in `.example.com` matches a **literal** hostname you (or a prior
  apply) put in the AP—compare `kubectl get ap <name> -n <ns> -o yaml` with
  `kubectl get ingress <name>-ingress -n <ns> -o yaml` if they disagree.
- The composed `Deployment`/`Service`/`Ingress`/`ConfigMap` ownerReference the `AP`. Composed
  child names: `Deployment={name}`, `Service={name}-service-port-{port}`,
  `Ingress={name}-ingress`, ConfigMap=`{name}-config-backup` (managed) and
  `{name}-config-snapshot-{hash}` (immutable rollback artifacts).

### `AP` configurable `spec` fields

| Field                            | Type                                        | Default     | Notes |
|----------------------------------|---------------------------------------------|-------------|-------|
| `crossplane.compositionRef.name` | string                                      | (XRD default) | Set to `aps-deployment-ingress-go-templating`. Omit to use the XRD default. |
| `image`                          | string                                      | —           | Container image, e.g. `nginx:latest` or `ghcr.io/<owner>/<repo>:<tag>`. |
| `replicas`                       | integer                                     | `1`         | Deployment replica count. |
| `endpoints[]`                    | `[{ port: int, host: string }]`             | —           | One Service + Ingress rule per entry. Empty array `[]` = no Service/Ingress. |
| `port` + `host`                  | int + string                                | —           | Legacy single endpoint, only used when `endpoints` is omitted. Prefer `endpoints`. |
| `cpuRequest` / `cpuLimit`        | string (k8s quantity)                       | `200m` / `2000m`   | Container resources. |
| `memoryRequest` / `memoryLimit`  | string (k8s quantity)                       | `204Mi` / `2048Mi` | Container resources. |
| `imagePullPolicy`                | `Always` \| `IfNotPresent` \| `Never`        | `Always`    | |
| `env[]`                          | `[{ name, value? , valueFrom? }]`           | `[]`        | `valueFrom` supports `secretKeyRef` and `configMapKeyRef` (standard Kubernetes EnvVarSource shape). |
| `ingressAnnotations`             | `map[string]string`                         | `{}`        | Extra annotations merged onto the rendered Ingress (in addition to the nginx defaults the composition always sets). |
| `probes.startup` / `liveness` / `readiness` | Kubernetes Probe                  | none        | No defaults applied. Each accepts `httpGet` / `tcpSocket` / `exec` / `grpc`. |
| `projectName`                    | string                                      | —           | Name of a `Project` claim **in the same namespace**. Adds labels `crossplane.io/project-name` + `crossplane.io/project-uid` to composed children and SSA-patches the AP itself with the same labels + a `Project` `ownerReference`. |
| `type`                           | `prelude`                                   | unset       | UI-only hint that the image may not be pullable yet (e.g. mid-build). Omit for normal deploys. |

`metadata.labels.region` (string) — **must match `BASE_HOST`** derived from
`{.clusters[0].cluster.server}` as in [§5.3](#53-derive-the-ingress-base-host) when you use this
strategy; see host-rewrite note above. Treated as part of the configurable surface even though it
lives on `metadata`, not `spec`.

`status` fields (read-only, useful when polling): `phase` (`Running` / `Progressing` /
`Failed` / `Degraded` / `Paused` / `Unknown`), `configVersionHash`, `projectName`,
`projectUid`, `conditions[]`.

---

## 2. `Project` — group multiple `AP`s under one Sealos Instance

A `Project` claim is a thin pointer: it composes exactly one `app.sealos.io/v1 Instance` with
the same name and namespace, labelled for the Sealos UI. Other resources "belong" to a project
by **the AP referencing it via `spec.projectName`**, not by being listed inside the Project's
own spec.

### `Project` configurable `spec` fields

| Field                            | Type    | Default | Notes |
|----------------------------------|---------|---------|-------|
| `crossplane.compositionRef.name` | string  | (XRD default) | Set to `project-instance-go-templating`. Omit to use the XRD default. |
| `public`                         | boolean | `false` | Becomes label `crossplane.io/project-public: "true"` / `"false"` on the composed Instance. |

The composed Instance picks up `cloud.sealos.io/deploy-on-sealos: {project-name}` and
`crossplane.io/project-uid: {project-uid}` automatically; you don't configure those.

---

## 3. Sandbox runtime (chat agent)

The chat backend runs your `bash` calls inside a Vercel Sandbox MicroVM with the user's
kubeconfig pre-mounted:

- `KUBECONFIG=/tmp/kubeconfig` is exported for every command.
- `kubectl` is on `PATH` (also at `/tmp/kubectl`); first invocation may pause briefly while it
  self-installs from `dl.k8s.io`.
- `bash`, `readFile`, `writeFile` tools all share the same VM. Use `writeFile` to drop a
  manifest at e.g. `/tmp/ap.yaml`, then `bash` `kubectl apply -f /tmp/ap.yaml`.
- Standard GNU userland is available (`grep`, `sed`, `awk`, `find`, `curl`, coreutils).

You do **not** configure contexts or `KUBECONFIG` — the sandbox is already pointed at the
user's cluster. Read it to make decisions; never assume a value.

---

## 4. Apply flow

1. **Verify the cluster and that the platform is installed** ([§5.1](#51-verify-cluster-access)).
   Stop and report verbatim if any of these fail.
2. **Resolve `metadata.namespace`** ([§5.2](#52-pick-the-namespace)). Confirm
   `kubectl auth can-i create aps -n <ns>` (and `... projects -n <ns>` if applying a Project).
3. For an `AP`:
   - Pick a host strategy ([§5.3](#53-derive-the-ingress-base-host)): explicit
     `endpoints[].host: <slug>.<base-host>` **or** `metadata.labels.region: <base-host>`.
4. **Apply Project before AP** when the AP sets `spec.projectName`, otherwise the AP's
   `project-observe` step has nothing to find on the first reconcile.
5. **Apply, then watch readiness** ([§5.4](#54-apply-and-watch)).

---

## 5. Tips

### 5.1 Verify cluster access

```bash
kubectl version --client=true
kubectl config current-context
kubectl cluster-info
kubectl api-resources --api-group=example.crossplane.io   # expect: aps, projects
kubectl get composition aps-deployment-ingress-go-templating project-instance-go-templating
```

If `api-resources` shows nothing under `example.crossplane.io`, the XRDs aren't installed and
this skill cannot be used — stop.

### 5.2 Pick the namespace

In order:

1. **User-supplied:** validate it.

   ```bash
   NS="<user-supplied>"
   kubectl get namespace "$NS"
   kubectl auth can-i create aps -n "$NS"
   kubectl auth can-i create projects -n "$NS"   # only if applying a Project
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

### 5.3 Derive the ingress base host

On Sealos-style clusters the API-server hostname doubles as the ingress DNS base
(nip.io / sslip.io / wildcard A record). Parse it from the active context:

```bash
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
BASE_HOST=$(printf '%s' "$SERVER" | sed -E 's#^https?://##; s#/.*$##; s#:[0-9]+$##')
echo "$BASE_HOST"
```

**`metadata.labels.region`:** when you choose the region-based host strategy, set this label to
**exactly** the `BASE_HOST` value produced above (host only: no `https://`, no trailing `:6443`).
Example: if the command prints `https://192.168.12.53.nip.io:6443`, then `region` must be
`192.168.12.53.nip.io`.

Then either:

- Set `endpoints[].host: <your-app>.<BASE_HOST>` per endpoint (use distinct slugs to avoid
  collisions in the same namespace), **or**
- Set `metadata.labels.region: <BASE_HOST>` and let the composition overwrite each endpoint
  with `{name}-<slug6>.<BASE_HOST>` (slug6 is a deterministic hash you don't control).

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
or time-based postfix to **`metadata.name` and** the left DNS label:

```bash
RAND=$(openssl rand -hex 3)
APP_SLUG="nginx-${RAND}"
# Use $APP_SLUG as metadata.name; host="${APP_SLUG}.${BASE_HOST}"
```

If `metadata.labels.region` is set, the composition ignores your literal `endpoints[].host` for
the rendered Ingress and uses `<metadata.name>-<slug6>.<region>` anyway ([§1](#1-ap--deploy-one-docker-image)) — pick a collision-safe **`metadata.name`** there too.

### 5.4 Apply and watch

```bash
NS="<your-namespace>"; NAME="<your-app>"
# Project first when AP references it
kubectl apply -n "$NS" -f /tmp/project.yaml
kubectl apply -n "$NS" -f /tmp/ap.yaml

kubectl get project,ap -n "$NS" -o wide
kubectl describe ap "$NAME" -n "$NS"
kubectl get deploy,svc,ingress -n "$NS" -l crossplane.io/composite="$NAME"
kubectl rollout status deploy/"$NAME" -n "$NS" --timeout=180s
```

If `describe ap` shows `SYNCED=False` or `READY=False`, read `status.conditions[*].message`
and the events on the composed Deployment for the actual failure (image pull, OOMKilled,
missing Secret, etc.).

### 5.5 Common gotchas

- **Endpoint host clashes** when two APs pick the same host. Either keep hosts unique or use
  `metadata.labels.region` so the composition appends a hash.
- **`spec.endpoints: []`** suppresses Service and Ingress entirely — useful for workers that
  shouldn't be reachable.
- **Changing `spec.image`** rolls the Deployment and stamps a new immutable
  `{name}-config-snapshot-{hash}` ConfigMap for rollback.
- **Deleting an AP** garbage-collects the Deployment/Service/Ingress/managed ConfigMap (they
  ownerReference the AP), but orphan config-snapshot ConfigMaps and their RBAC intentionally
  survive. Clean them up manually with
  `kubectl get cm -n "$NS" -l app.sealos.io/ap-uid=<uid>` if needed.
- **Deleting a Project** removes the Instance, but APs that referenced it keep dangling
  `crossplane.io/project-*` labels and ownerRef — delete the dependent APs first, or accept
  GC chaining.

### 5.6 Troubleshooting: wrong host (e.g. `.example.com`), or `kubectl apply` says `unchanged`

1. **Compare claim vs composed Ingress** (traffic follows the Ingress, not your YAML file on disk):

   ```bash
   kubectl get ap "$NAME" -n "$NS" -o jsonpath='{.spec.endpoints}' ; echo
   kubectl get ingress "${NAME}-ingress" -n "$NS" -o jsonpath='{.spec.rules[*].host}' ; echo
   ```

2. **`metadata.labels.region` overrides `spec.endpoints[].host`**: when `region` is set, the
   composition **replaces** every endpoint host with `<metadata.name>-<slug6>.<region>` for
   the rendered Ingress. Remove `metadata.labels.region` if you need full manual control of
   `endpoints[].host` ([§1](#1-ap--deploy-one-docker-image)).

3. **`kubectl apply ... unchanged`**: the live **AP** object already matched your manifest. If
   you thought you changed the host, re-check namespace/name, `kubectl get ap ... -o yaml`, and
   whether another controller (SSA field manager / webhook) resets `spec.endpoints`.

4. **Stale Ingress after fixing `spec.endpoints`**: if the AP spec shows the new host but
   `kubectl get ingress` still shows an old one, inspect `kubectl describe ap` (sync/ready).
   Wait for reconcile, or apply a harmless metadata annotation bump to force a new pipeline
   pass; if still wedged, recreate the AP with a **new** `metadata.name` and a fresh host.

5. **UI / list APIs**: some stacks treat `placeholder.example.com` as a non-user-facing
   placeholder; bogus `example.com` hosts from an early apply may also confuse summaries until
   the Ingress actually updates. Trust `kubectl get ingress` for the live routing hostname.

---

## 6. Claim YAML examples

Replace `<your-namespace>`, `<your-app>`, `<your-project>`, `<base-host>`, `<owner>`, `<repo>`,
`<tag>` with values you've validated on the active cluster ([§5](#5-tips)). **`<base-host>` must
come from [§5.3](#53-derive-the-ingress-base-host)** (often a `*.nip.io` / cluster-specific domain),
never a made-up `example.com` zone. Prefer collision-proof `<your-app>` labels (see hostname and
collision notes under §5.3).

### 6.1 Minimal `AP` (public image, explicit host)

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
  image: nginx:latest
  replicas: 1
  endpoints:
    - port: 80
      host: <your-app>.<base-host>
```

### 6.2 `AP` attached to a `Project`, with explicit resources

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
  image: nginx:latest
  projectName: <your-project>
  replicas: 1
  endpoints:
    - port: 80
      host: <your-app>.<base-host>
  cpuRequest: 250m
  memoryRequest: 512Mi
  cpuLimit: 500m
  memoryLimit: 1Gi
```

### 6.3 `AP` with multiple endpoints, env, probes, ingress annotations

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
  image: ghcr.io/<owner>/<repo>:<tag>
  replicas: 2
  endpoints:
    - port: 8080
      host: <your-app>.<base-host>
    - port: 9090
      host: <your-app>-metrics.<base-host>
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
  ingressAnnotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```

### 6.4 `AP` with composition-derived hosts (`region` label)

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
    compositionRef:
      name: aps-deployment-ingress-go-templating
  image: nginx:latest
  endpoints:
    - port: 80
      # When `region` is set, this host is NOT used for Ingress; effective host is <name>-<slug6>.<region>
      host: dns-ignored.invalid
```

### 6.5 Minimal `Project`

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
