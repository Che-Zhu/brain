# brain-system Helm Chart

This chart is the preferred entrypoint for deploying the `brain-system` stack.

It renders:

- `DB` claim: `brain-pg`
- `AP` claims: `sealai-api-staging`, `sealai-ui-staging`, `sealai-registry`
- native Kubernetes `Deployment` and `Service`: `whodb`
- optional app env `Secret` objects
- optional image pull `Secret`

## Prerequisites

The cluster must already have these platform resources installed:

- Crossplane `2.2.0`
- `provider-kubernetes`
- `function-go-templating`
- KubeBlocks with PostgreSQL support
- ingress-nginx `IngressClass/nginx`
- VictoriaMetrics and VictoriaLogs if API metrics/log endpoints are used
- repo Crossplane XRDs and Compositions from `deploy/brain-system/platform/resources.txt`

Apply the repo platform resources:

```bash
xargs -I{} kubectl apply -f {} < deploy/brain-system/platform/resources.txt
```

## Install

Create a private values file:

```bash
cp charts/brain-system/values.local.example.yaml /tmp/brain-system.values.yaml
```

Edit `/tmp/brain-system.values.yaml`, especially:

- `global.region`
- `api.env.ENCODED_ADMIN_KUBECONFIG`
- `ui.env.API_URL`
- `ui.env.DATABASE_URL`
- GitHub OAuth values
- assistant model values (`SYSTEM_OPENAI_*`, `FREE_CHAT_TURNS`, `AI_PROXY_TOKEN_NAME`)
- Devbox runtime values (`SEALOS_HOST`, `DEVBOX_TOKEN` or `DEVBOX_JWT_SIGNING_KEY`)
- `imagePullSecret.create`: keep `true` if `ghcr-cred` does not already exist

Generate the URL-encoded kubeconfig value:

```bash
node -e 'console.log(encodeURIComponent(require("fs").readFileSync(process.env.KUBECONFIG, "utf8")))'
```

Install or upgrade:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n brain-system \
  --create-namespace \
  -f /tmp/brain-system.values.yaml
```

## First Database Install

The DB controller generates `brain-pg-conn-credential`. The UI still needs a complete `DATABASE_URL`.

For a brand-new cluster, the practical sequence is:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n brain-system \
  --create-namespace \
  -f /tmp/brain-system.values.yaml \
  --set ui.enabled=false

kubectl -n brain-system get secret brain-pg-conn-credential -o yaml
```

Use that password to fill `ui.env.DATABASE_URL`, then run the normal install command again without `--set ui.enabled=false`.

## Verify

```bash
kubectl -n brain-system get ap,db
kubectl -n brain-system get deploy,pod,svc,ingress,instanceset -o wide
kubectl -n brain-system rollout status deploy/whodb --timeout=5m
```

For AP-generated workloads:

```bash
kubectl -n brain-system wait ap/sealai-api-staging --for=condition=Ready --timeout=10m
kubectl -n brain-system wait ap/sealai-ui-staging --for=condition=Ready --timeout=10m
kubectl -n brain-system wait ap/sealai-registry --for=condition=Ready --timeout=10m
```
