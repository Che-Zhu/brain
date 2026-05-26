# brain-system platform resources

This directory lists the Crossplane package, RBAC, XRD, and Composition resources required before applying `deploy/brain-system`.

Apply from the repo root:

```bash
xargs -I{} kubectl apply -f {} < deploy/brain-system/platform/resources.txt
```

Server-side dry run from the repo root:

```bash
xargs -I{} kubectl apply --dry-run=server -f {} < deploy/brain-system/platform/resources.txt
```

The resources are referenced from their source locations under `packages/crossplane/public` to avoid duplicating large platform manifests under `deploy/`.

