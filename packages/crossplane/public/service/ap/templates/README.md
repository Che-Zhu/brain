# Crossplane Compositions for Sealos Templates

This directory contains Crossplane Composition files automatically generated from Sealos application templates located in the `../template/` directory.

## Overview

Each Sealos `Template` (Kind: `app.sealos.io/v1`) has been converted into a Crossplane `Composition` that uses the `AP` (Application) XRD defined in `../ap.yaml`. The compositions use Go templating via the `crossplane-contrib-function-go-templating` function.

## Structure

- `*-composite.yaml` - Crossplane Composition definitions
- `*-instance.yaml` - Example instance files for testing

## Conversion Pattern

### From Sealos Template to Crossplane Composition

#### Sealos Template Structure:
```yaml
apiVersion: app.sealos.io/v1
kind: Template
metadata:
  name: app-name
spec:
  title: 'App Title'
  defaults:
    app_name:
      value: appname-${{ random(8) }}
  inputs:
    PARAM_NAME:
      description: 'Parameter description'
      type: string
      required: true
---
# Kubernetes resources (Deployment, Service, Ingress, etc.)
```

#### Crossplane Composition Structure:
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aps-app-name-go-templating
  labels:
    template: app-name
spec:
  compositeTypeRef:
    apiVersion: example.crossplane.io/v1
    kind: AP
  mode: Pipeline
  pipeline:
    - step: render-app-name
      functionRef:
        name: crossplane-contrib-function-go-templating
      input:
        apiVersion: gotemplating.fn.crossplane.io/v1beta1
        kind: GoTemplate
        source: Inline
        inline:
          template: |
            {{- $name := .observed.composite.resource.spec.name }}
            {{- $ns := .observed.composite.resource.metadata.namespace }}
            {{- $spec := .observed.composite.resource.spec }}
            # ... Kubernetes resources with Go template syntax
```

## Variable Mapping

| Sealos Syntax | Crossplane Go Template |
|---------------|------------------------|
| `${{ defaults.app_name }}` | `{{ $name }}-{{ $suffix }}` |
| `${{ defaults.app_host }}` | `{{ $host }}` (from `$spec.host`) |
| `${{ inputs.PARAM_NAME }}` | `{{ $spec.paramName }}` |
| `${{ SEALOS_NAMESPACE }}` | `{{ $ns }}` |
| `${{ SEALOS_CLOUD_DOMAIN }}` | Part of `$spec.host` |
| `${{ SEALOS_CERT_SECRET_NAME }}` | `wildcard-cert` (hardcoded) |
| `${{ random(8) }}` | `{{ $suffix }}` (from UID hash) |

## Unique Identifier Generation

Each composition generates a unique suffix from the resource UID:
```go
{{- $uid := printf "%s" (index .observed.composite.resource.metadata "uid" | default "") -}}
{{- $suffix := (replace "-" "" $uid | trunc 4) | default (sha256sum (printf "%s-%s" $ns $name) | trunc 4) }}
{{- $deployId := printf "%s-%s" $name $suffix }}
```

## Common Patterns

### 1. Simple Deployment + Service + Ingress

Examples: `chatgpt-next-web`, `lobe-chat`, `code-server`

Pattern:
- Single Deployment with container
- Service exposing deployment
- Ingress with TLS

### 2. StatefulSet with Persistent Volume

Examples: `memos`, `affine`, `grafana`

Pattern:
- StatefulSet with volumeClaimTemplates
- Service (headless or regular)
- Ingress with TLS

### 3. Multi-Service Applications

Examples: `fastgpt`, `perplexica`

Pattern:
- Multiple Deployments/StatefulSets
- Multiple Services for each component
- Shared ConfigMaps
- Database dependencies (KubeBlocks Clusters)
- Single Ingress routing to main service

### 4. Applications with Databases

Examples: `fastgpt`, `chatwoot`, `nocodb`

Pattern:
- Application Deployment
- KubeBlocks Cluster (MongoDB, PostgreSQL, MySQL, Redis)
- ServiceAccount + Role + RoleBinding for database
- Connection secrets referenced in app env

### 5. Applications with Object Storage

Examples: `fastgpt-plugin`, `nextcloud`

Pattern:
- ObjectStorageBucket resource
- Secret with access keys: `object-storage-key-{SA}-{name}`
- Environment variables: ACCESS_KEY, SECRET_KEY, ENDPOINT, BUCKET

### 6. Distributed StatefulSet Applications

Example: `minio`

Pattern:
- StatefulSet with multiple replicas (e.g., 4 for MinIO distributed mode)
- Headless service for pod-to-pod communication
- Additional ClusterIP service for external access
- Multiple Ingress resources for different endpoints (console + API)
- Args referencing pod DNS names for distributed configuration
- Health probes (liveness and readiness)
- Pod management policy: Parallel for faster startup

Key features demonstrated in MinIO:
```yaml
# Headless service for inter-pod communication
spec:
  clusterIP: None

# Args using StatefulSet pod DNS pattern
args:
  - server
  - http://name-{0...3}.service.namespace.svc.cluster.local/data

# Pod management
spec:
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
```

## Instance File Pattern

To use a composition, create an AP instance:

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: my-app
  namespace: my-namespace
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: app-name

  # Template-specific fields
  template: app-name
  name: my-app
  # projectName: my-project

  # Sealos template inputs + deployment overrides
  input:
    paramName: "value"
    host: myapp.example.com   # used when metadata.labels.region is omitted

  # Scale and container resources (aps-deployment-ingress-go-templating)
  resource:
    replicas: 1
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "1000m"
      memory: "1024Mi"
```

## Required Annotations

All composed resources must include:

```yaml
annotations:
  gotemplating.fn.crossplane.io/composition-resource-name: unique-resource-name
  gotemplating.fn.crossplane.io/ready: "True"  # For main workload
```

All resources must include labels:

```yaml
labels:
  cloud.sealos.io/deploy-on-sealos: {{ $deployId }}
  cloud.sealos.io/app-deploy-manager: {{ $resourceName }}
```

## Status Updates

Each composition must update the AP status:

```yaml
---
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: {{ .observed.composite.resource.metadata.name }}
  namespace: {{ $ns }}
status:
  phase: Ready
```

## Testing Compositions

1. Ensure Crossplane and the Go templating function are installed:
```bash
kubectl apply -f ../go-template.yaml
```

2. Apply the XRD:
```bash
kubectl apply -f ../ap.yaml
```

3. Apply a composition:
```bash
kubectl apply -f chatgpt-next-web-composite.yaml
```

4. Create an instance:
```bash
kubectl apply -f chatgpt-next-web-instance.yaml
```

5. Check status:
```bash
kubectl get ap my-app -o yaml
kubectl get deployment,service,ingress -l cloud.sealos.io/deploy-on-sealos=my-app-xxxx
```

## Extending the AP XRD

If a Sealos template uses parameters not yet defined in the AP XRD, you need to extend `../ap.yaml`:

```yaml
spec:
  versions:
  - name: v1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              # Add new fields here
              newParameter:
                type: string
                description: New parameter description
```

## Conversion Script

A Python script is available to automate conversion of simple templates:

```bash
python3 convert-sealos-to-crossplane.py ../template/app-name.yaml > app-name-composite.yaml
```

See `convert-sealos-to-crossplane.py` for implementation details.

## Templates Converted

### Simple Templates (Deployment)
- [x] chatgpt-next-web - Cross-platform ChatGPT/Gemini UI
- [x] lobe-chat - Modern ChatGPT/LLMs UI with plugin system
- [x] midjourney-ui - AI drawing UI for Midjourney

### Simple Templates (StatefulSet)
- [x] memos - Privacy-first note-taking service
- [x] code-server - VS Code in browser with persistent workspace
- [x] cronicle - Task scheduler with web UI (3 volumes)
- [x] uptime-kuma - Easy-to-use self-hosted monitoring tool

### Distributed StatefulSet (Advanced)
- [x] minio - High Performance S3-compatible Object Storage (4 replicas, dual ingress)

### Templates with External Dependencies
- [x] metabase - BI platform (requires external PostgreSQL)
- [x] dataease - Data visualization tool (requires external MySQL)

### Complex Templates (Multi-service)
- [x] perplexica - AI search engine (already exists in root directory)

### Statistics
- **Total Sealos templates**: 75 (in template/ directory)
- **Converted to Crossplane**: 11 (14.7%)
- **Ready to use**: 11

### Pending Conversion (64 templates remaining)

**By Category**:
- AI/Chat applications: ~30 templates
- Development tools: ~20 templates
- Business/Productivity: ~25 templates
- Databases: ~15 templates
- Monitoring/Logging: ~10 templates
- Gaming servers: ~8 templates
- Content management: ~15 templates
- Other: ~39 templates

**Special Handling Required**:
- Templates with integrated databases (need DB XRD integration): ~40 templates
- Templates with object storage: ~15 templates
- Templates with Jobs/CronJobs: ~10 templates
- Templates with complex multi-service architectures: ~20 templates
- Templates with custom CRDs or operators: ~5 templates

## Reference

- Crossplane Compositions: https://docs.crossplane.io/latest/concepts/compositions/
- Go Templating Function: https://github.com/crossplane-contrib/function-go-templating
- Sealos Template Guide: ../templates/example.md
- AP XRD: ../ap.yaml
- DB XRD: ../db.yaml
