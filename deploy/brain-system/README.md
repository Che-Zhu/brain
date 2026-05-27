# brain-system deploy config

This directory contains the raw declarative resources for the `brain-system` namespace.

The preferred deployment entrypoint is now the Helm chart:

```bash
helm upgrade --install brain-system charts/brain-system \
  -n brain-system \
  --create-namespace \
  -f /tmp/brain-system.values.yaml
```

Use this directory as platform bootstrap input and as a raw-manifest reference when debugging.

## Apply order

1. Install platform controllers and add-ons: Crossplane, provider-kubernetes, function-go-templating, KubeBlocks, ingress-nginx, VictoriaMetrics, and VictoriaLogs.
2. Apply platform Crossplane packages, RBAC, XRDs, and compositions:

   ```bash
   xargs -I{} kubectl apply -f {} < deploy/brain-system/platform/resources.txt
   ```

3. Deploy the application stack through `charts/brain-system`.

## Raw manifest fallback

If Helm is not available, create real secrets from local values. The files under `secrets/*.example.yaml` are examples only and are not referenced by `kustomization.yaml`.

Then apply the namespace, DB claim, AP claims, and WhoDB resources:

   ```bash
   kubectl apply -k deploy/brain-system
   ```

Verify:

   ```bash
   kubectl -n brain-system get ap,db
   kubectl -n brain-system get deploy,instanceset,pod,svc,ingress -o wide
   ```

For the full runbook, see `docs/deployment/brain-system.md`.
