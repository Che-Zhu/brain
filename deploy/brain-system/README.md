# brain-system deploy config

This directory contains the declarative resources for the `brain-system` namespace.

## Apply order

1. Install platform controllers and add-ons: Crossplane, provider-kubernetes, function-go-templating, KubeBlocks, ingress-nginx, VictoriaMetrics, and VictoriaLogs.
2. Apply platform Crossplane packages, RBAC, XRDs, and compositions:

   ```bash
   xargs -I{} kubectl apply -f {} < deploy/brain-system/platform/resources.txt
   ```

3. Create real secrets from local values. The files under `secrets/*.example.yaml` are examples only and are not referenced by `kustomization.yaml`.
4. Apply the namespace, DB claim, AP claims, and WhoDB resources:

   ```bash
   kubectl apply -k deploy/brain-system
   ```

5. Verify:

   ```bash
   kubectl -n brain-system get ap,db
   kubectl -n brain-system get deploy,instanceset,pod,svc,ingress -o wide
   ```

For the full runbook, see `docs/deployment/brain-system.md`.
