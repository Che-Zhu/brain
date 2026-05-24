# Crossplane Composition Usage Examples

This document provides practical examples for using the Crossplane compositions generated from Sealos templates.

## Regenerating compositions from Sealos templates

Compositions are synced from Sealos `index.yaml` manifests (e.g. `~/Downloads/templates/template/<name>/index.yaml`) using:

```bash
cd packages/crossplane/public/service/ap/templates
python3 -m venv .venv-sync && .venv-sync/bin/pip install pyyaml
.venv-sync/bin/python sync-sealos-templates.py              # all templates
.venv-sync/bin/python sync-sealos-templates.py --only agora # one template
```

Each `template/instance` annotation lists template parameters under **`spec.input`** (`openaiApiKey`, `adminPassword`, etc.) copied from Sealos `inputs` / `defaults`. AP Replica Strategy and CPU/memory live under **`spec.resource`** (`replicaStrategy`, `requests`, `limits`). **`spec.projectName`** stays top-level. Do not use historical flat fields such as `spec.cpuRequest`, `spec.image`, or `spec.endpoints`; those fields are not part of the AP XRD. Legacy `spec.resource.replicas` remains accepted only as a Fixed Replicas fallback when `spec.resource.replicaStrategy` is absent.

These generated app-store template compositions are a non-product compatibility path. They may still read template-specific `spec.input.host` values because they mirror upstream Sealos templates. The active AP Settings, API docs, and default deployment composition use `spec.input.network` and `status.network`; do not add `spec.input.endpoints[]`, `status.endpoints[]`, or a port-matrix UI to support these generated templates.

## Canonical AP Replica Strategy examples

For new AP Settings writes, use `spec.resource.replicaStrategy` as the canonical AP Replica
Strategy model. AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API. Elastic Scaling is reconciled by the AP Composition as an AP-owned horizontal autoscaler.

Representative AP examples live in `packages/crossplane/public/example/ap/`:

- `ap-fixed-replicas-example.yaml` - Fixed Replicas.
- `ap-cpu-elastic-example.yaml` - CPU Elastic Scaling.
- `ap-memory-elastic-example.yaml` - Memory Elastic Scaling.
- `ap-legacy-fixed-example.yaml` - legacy `spec.resource.replicas` fallback.

Fixed Replicas:

```yaml
resource:
  replicaStrategy:
    type: fixed
    fixed:
      replicas: 2
```

CPU Elastic Scaling:

```yaml
resource:
  replicaStrategy:
    type: elastic
    elastic:
      minReplicas: 2
      maxReplicas: 8
      target:
        metric: cpu
        type: utilization
        utilizationPercent: 75
```

Memory Elastic Scaling:

```yaml
resource:
  replicaStrategy:
    type: elastic
    elastic:
      minReplicas: 2
      maxReplicas: 8
      target:
        metric: memory
        type: averageValue
        averageValue: 512Mi
```

## Prerequisites

1. **Install Crossplane**:
```bash
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane crossplane-stable/crossplane --namespace crossplane-system --create-namespace
```

2. **Install Go Templating Function**:
```bash
kubectl apply -f ../go-template.yaml
```

3. **Install XRDs**:
```bash
kubectl apply -f ../ap.yaml
kubectl apply -f ../db.yaml
```

4. **Install Compositions**:
```bash
# Install all compositions
kubectl apply -f ./*-composite.yaml

# Or install specific ones
kubectl apply -f chatgpt-next-web-composite.yaml
kubectl apply -f lobe-chat-composite.yaml
```

## Example 1: Deploy ChatGPT Next Web

Create an instance file `my-chatgpt.yaml`:

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: my-chatgpt
  namespace: default
spec:
  # Composition selection
  crossplane:
    compositionSelector:
      matchLabels:
        template: chatgpt-next-web

  # Template identifier
  template: chatgpt-next-web
  name: my-chatgpt

  # Sealos template inputs (see chatgpt-next-web-composite.yaml template/instance)
  input:
    openaiApiKey: "sk-your-openai-api-key-here"
    code: "my-secure-password"
    baseUrl: "https://api.openai.com"
    # azureUrl: "https://your-resource.openai.azure.com/openai/deployments/gpt-4"
    # azureApiKey: "your-azure-key"
    # azureApiVersion: "2023-05-15"

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "1000m"
      memory: "1024Mi"
```

For the active default AP composition, public access is represented under `input.network`:

```yaml
    network:
      privatePort: 3000
      platformAddresses:
        - id: pa_chatgpt
          port: 3000
```

For a generated app-store template composition, use `input.host` only when that composition's `template/instance` annotation lists `host` as a template parameter.

Deploy:
```bash
kubectl apply -f my-chatgpt.yaml
```

Check status:
```bash
kubectl get ap my-chatgpt
kubectl get deployment,service,ingress -l cloud.sealos.io/deploy-on-sealos=my-chatgpt-*
```

Access:
- URL: `https://chatgpt.mydomain.com`
- Password: `my-secure-password`

## Example 2: Deploy Lobe Chat

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: my-lobe-chat
  namespace: production
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: lobe-chat

  template: lobe-chat
  name: my-lobe-chat

  input:
    host: lobe.mydomain.com

    # OpenAI configuration
    openaiApiKey: "sk-your-api-key"
    openaiProxyUrl: "https://api.openai.com/v1"

    # Access control
    accessCode: "password1,password2,password3"  # Multiple passwords

    # Model configuration
    openaiModelList: "+gpt-4-vision-preview,-gpt-3.5-turbo"

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 2
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "2000m"
      memory: "2048Mi"
```

## Example 3: Deploy Memos (StatefulSet with Storage)

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: my-memos
  namespace: default
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: memos

  template: memos
  name: my-memos

  input:
    host: memos.mydomain.com
    storageSize: "10Gi"  # Persistent storage for notes

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

## Example 4: Deploy Code Server (VS Code in Browser)

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: dev-workspace
  namespace: development
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: code-server

  template: code-server
  name: dev-workspace

  input:
    host: code.mydomain.com

    # Authentication
    password: "my-secure-development-password"

    # Timezone
    timeZone: "America/New_York"

    # Storage for development environment
    storageSize: "50Gi"

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "500m"
      memory: "1024Mi"
    limits:
      cpu: "4000m"
      memory: "8192Mi"
```

## Example 5: Deploy Metabase (with External Database)

**Note**: Metabase requires an external PostgreSQL database.

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: analytics
  namespace: default
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: metabase

  template: metabase
  name: analytics

  input:
    host: metabase.mydomain.com

    # External PostgreSQL database connection
    dbHost: "postgres.database.svc.cluster.local"
    dbPort: "5432"
    dbUser: "metabase"
    dbPassword: "secure-db-password"
    dbName: "metabase"

    # Storage for plugins
    storageSize: "1Gi"

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2048Mi"
```

Setup PostgreSQL first:
```bash
# Example using DB XRD
kubectl apply -f - <<EOF
apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: metabase-db
  namespace: default
spec:
  engine: postgresql
  quota: xs
EOF
```

## Example 6: Deploy Perplexica (Complex Multi-Service)

```yaml
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: search-ai
  namespace: default
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: perplexica

  template: perplexica
  name: search-ai

  input:
    host: search.mydomain.com

    # OpenAI-compatible API configuration
    apiKey: "sk-your-api-key"
    apiUrl: "https://api.openai.com/v1"
    modelName: "gpt-4-turbo-preview"

  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "1000m"
      memory: "1024Mi"
```

## Common Patterns

### Pattern 1: Development vs Production

**Development**:
```yaml
spec:
  input:
    storageSize: "5Gi"
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 1
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

**Production**:
```yaml
spec:
  input:
    storageSize: "50Gi"
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 3
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2048Mi"
```

### Pattern 2: Multiple Platform Addresses

```yaml
input:
  network:
    privatePort: 3000
    platformAddresses:
      - id: pa_app001
        port: 3000
      - id: pa_app002
        port: 3000
      - id: pa_admin1
        port: 9000
```

### Pattern 3: Namespace Isolation

```yaml
# Development namespace
metadata:
  namespace: development

# Production namespace
metadata:
  namespace: production

# Per-team namespaces
metadata:
  namespace: team-frontend
```

## Troubleshooting

### Check Composition Status

```bash
# List all AP resources
kubectl get ap -A

# Get detailed status
kubectl describe ap my-app -n default

# Check composed resources
kubectl get deployment,service,ingress -l cloud.sealos.io/deploy-on-sealos=my-app-*
```

### Check Function Logs

```bash
# Get function pod
kubectl get pods -n crossplane-system | grep function-go-templating

# View logs
kubectl logs -n crossplane-system <pod-name>
```

### Common Issues

1. **Composition not found**: Ensure composition is installed and labels match
   ```bash
   kubectl get composition aps-chatgpt-next-web-go-templating
   ```

2. **Resources not created**: Check XR status
   ```bash
   kubectl get composite -A
   kubectl describe composite <name>
   ```

3. **Ingress not accessible**:
   - Verify DNS points to cluster ingress
   - Check TLS secret exists: `kubectl get secret wildcard-cert`
   - Verify nginx ingress controller is running

4. **Database connection failed** (metabase, dataease):
   - Verify database is running and accessible
   - Check connection credentials
   - Test connection from a debug pod

## Scaling

### Horizontal Scaling

```bash
# Edit the AP resource
kubectl edit ap my-app

# Change Fixed Replicas
spec:
  resource:
    replicaStrategy:
      type: fixed
      fixed:
        replicas: 5
```

### Vertical Scaling

```bash
kubectl edit ap my-app

# Increase resources
spec:
  resource:
    limits:
      cpu: "4000m"
      memory: "8192Mi"
```

### Storage Scaling

For StatefulSets with PVCs, you may need to:
```bash
# Edit PVC directly (if storage class supports expansion)
kubectl edit pvc vn-data-my-app-statefulset-xxxx-0

# Update storage size
spec:
  resources:
    requests:
      storage: 20Gi
```

## Deletion

### Delete Application

```bash
kubectl delete ap my-app -n default
```

This will automatically delete all composed resources (Deployment, Service, Ingress).

### Delete Composition

```bash
kubectl delete composition aps-chatgpt-next-web-go-templating
```

**Warning**: Only delete compositions when no instances are using them.

## Best Practices

1. **Use namespaces** for environment isolation
2. **Set resource limits** to prevent resource exhaustion
3. **Use secrets** for sensitive data instead of plain text in specs
4. **Monitor resource usage** and adjust limits accordingly
5. **Backup persistent data** before scaling down or deleting
6. **Test in development** before deploying to production
7. **Use version-specific** image tags instead of `:latest`
8. **Configure ingress** annotations for your specific needs
9. **Set up monitoring** and logging for production workloads
10. **Document custom** configurations for your team

## Advanced: Using Secrets for Credentials

Instead of storing API keys in AP spec:

```yaml
# Create secret
kubectl create secret generic chatgpt-credentials \
  --from-literal=api-key=sk-your-key \
  --from-literal=password=your-password

# Modify composition to read from secret
# (Requires XRD modification to support secretRef)
```

## Next Steps

- Review composition YAMLs to understand resource structure
- Extend AP XRD with additional fields as needed
- Create custom compositions for your specific applications
- Set up CI/CD pipelines for automated deployments
- Integrate with GitOps tools (ArgoCD, Flux)
