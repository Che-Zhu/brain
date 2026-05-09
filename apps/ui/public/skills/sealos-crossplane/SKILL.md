---
name: sealos-crossplane
description: >-
  Sealos Crossplane XRDs `AP` (deploy a Docker image as Deployment + Service + Ingress via
  `aps-deployment-ingress-go-templating`) and `Project` (group resources via
  `project-instance-go-templating`), both `example.crossplane.io/v1`, namespaced. Lists every
  configurable spec field, a few valid claim examples, and the bash commands the chat sandbox
  needs (KUBECONFIG=/tmp/kubeconfig, kubectl on PATH) to pick the namespace, derive the
  ingress base host, and prepare the `ghcr-cred` pull Secret before applying.
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

- The Pod template hard-codes `imagePullSecrets: [{ name: ghcr-cred }]`. The Secret named
  **`ghcr-cred`** must exist in the claim's namespace (see [§5.4](#54-ghcr-cred-pull-secret)).
- The `Ingress` uses `ingressClassName: nginx` and TLS via `secretName: wildcard-cert` in the
  same namespace.
- If `metadata.labels.region: <base-host>` is set, the composition **overwrites every**
  `spec.endpoints[].host` with `{metadata.name}-{slug6}.{region}` where `slug6` is the first
  6 hex chars of `sha256(name|namespace|uid)`. Either set `region` and let it compute hosts,
  **or** set explicit `endpoints[].host` and omit `region`. Don't mix.
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

`metadata.labels.region` (string) — see host-rewrite note above; treated as part of the
configurable surface even though it lives on `metadata`, not `spec`.

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
   - For `image: ghcr.io/...` make sure `ghcr-cred` exists with valid creds
     ([§5.4](#54-ghcr-cred-pull-secret)).
4. **Apply Project before AP** when the AP sets `spec.projectName`, otherwise the AP's
   `project-observe` step has nothing to find on the first reconcile.
5. **Apply, then watch readiness** ([§5.5](#55-apply-and-watch)).

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

Then either:

- Set `endpoints[].host: <your-app>.<BASE_HOST>` per endpoint (use distinct slugs to avoid
  collisions in the same namespace), **or**
- Set `metadata.labels.region: <BASE_HOST>` and let the composition overwrite each endpoint
  with `{name}-<slug6>.<BASE_HOST>` (slug6 is a deterministic hash you don't control).

If `$SERVER` is an internal IP that won't resolve publicly, ask the user what ingress base host
the platform exposes — don't guess.

### 5.4 `ghcr-cred` pull Secret

The Pod always references `imagePullSecrets: [{ name: ghcr-cred }]`. Check before applying:

```bash
kubectl get secret ghcr-cred -n "$NS" 2>/dev/null || echo "missing"
```

- **Public image** (Docker Hub `nginx:latest`, etc.): the Secret can be missing (kubelet logs a
  warning, pull still works). To silence the warning:

  ```bash
  kubectl create secret docker-registry ghcr-cred -n "$NS" \
    --docker-server=ghcr.io \
    --docker-username=anonymous --docker-password=anonymous \
    --docker-email=unused@example.com
  ```

- **Private `ghcr.io/<owner>/...` image**: the Secret **must** be valid or kubelet will loop
  on `ImagePullBackOff`. Ask the user for a GitHub PAT (classic `read:packages` or fine-grained
  packages-read) and the owner:

  ```bash
  OWNER="<github-owner>"; TOKEN="<github-pat>"
  AUTH=$(printf '%s:%s' "$OWNER" "$TOKEN" | base64 | tr -d '\n')
  cat <<EOF | kubectl apply -n "$NS" -f -
  apiVersion: v1
  kind: Secret
  metadata: { name: ghcr-cred }
  type: kubernetes.io/dockerconfigjson
  stringData:
    githubToken: "$TOKEN"
    .dockerconfigjson: |
      {"auths":{"ghcr.io":{"auth":"$AUTH","email":"unused@example.com"}}}
  EOF
  ```

  If the user can't provide a token, **stop** — don't apply an AP that will permanently fail
  to pull.

### 5.5 Apply and watch

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

### 5.6 Common gotchas

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

---

## 6. Claim YAML examples

Replace `<your-namespace>`, `<your-app>`, `<your-project>`, `<base-host>`, `<owner>`, `<repo>`,
`<tag>` with values you've validated on the active cluster ([§5](#5-tips)).

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
  image: ghcr.io/<owner>/<repo>:<tag>     # requires ghcr-cred (§5.4)
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
      host: ignored.example.com    # overwritten with <your-app>-<slug6>.<base-host>
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
