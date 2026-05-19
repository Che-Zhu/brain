# Quick Start Guide

This guide provides rapid deployment instructions for each converted template.

**AP claim shape:** put Sealos template parameters under **`spec.input`**, and **`spec.resource`** for `replicas` / `requests` / `limits`. The authoritative field list for each app is the `metadata.annotations.template/instance` block on its `*-composite.yaml` file (regenerate with `sync-sealos-templates.py`). Flat `spec.cpuRequest`, `spec.host`, and `spec.image` are no longer valid on the AP XRD.

## Prerequisites

```bash
# 1. Install Crossplane
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system --create-namespace

# 2. Install Go Templating Function
kubectl apply -f ../go-template.yaml

# 3. Install XRDs
kubectl apply -f ../ap.yaml

# 4. Install all compositions
kubectl apply -f ./*-composite.yaml
```

## Template Quick Reference

### 🤖 AI Chat Applications

#### ChatGPT Next Web
```bash
# Basic OpenAI setup
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: chatgpt
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: chatgpt-next-web
  template: chatgpt-next-web
  name: chatgpt
  host: chatgpt.example.com
  openaiApiKey: "sk-your-key"
  code: "access-password"
EOF
```

#### Lobe Chat
```bash
# OpenAI with access codes
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: lobe
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: lobe-chat
  template: lobe-chat
  name: lobe
  host: lobe.example.com
  openaiApiKey: "sk-your-key"
  accessCode: "pass1,pass2,pass3"
EOF
```

#### Perplexica (AI Search)
```bash
# OpenAI-compatible API
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: search
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: perplexica
  template: perplexica
  name: search
  host: search.example.com
  apiKey: "sk-your-key"
  apiUrl: "https://api.openai.com/v1"
  modelName: "gpt-4-turbo-preview"
EOF
```

### 📝 Note-Taking & Personal Tools

#### Memos
```bash
# Simple note-taking service
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: notes
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: memos
  template: memos
  name: notes
  host: notes.example.com
  storageSize: "5Gi"
EOF
```

### 💻 Development Tools

#### Code Server (VS Code in Browser)
```bash
# Browser-based VS Code
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: vscode
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: code-server
  template: code-server
  name: vscode
  host: code.example.com
  password: "secure-password"
  storageSize: "20Gi"
EOF
```

### 📊 Monitoring & Analytics

#### Uptime Kuma
```bash
# Service uptime monitoring
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: monitor
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: uptime-kuma
  template: uptime-kuma
  name: monitor
  host: uptime.example.com
  storageSize: "2Gi"
EOF
```

#### Metabase (Business Intelligence)
```bash
# Requires external PostgreSQL database first!
# See USAGE.md for database setup

cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: analytics
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: metabase
  template: metabase
  name: analytics
  host: metabase.example.com
  dbHost: "postgres.default.svc.cluster.local"
  dbPort: "5432"
  dbUser: "metabase"
  dbPassword: "password"
  dbName: "metabase"
EOF
```

### 🗄️ Storage & Infrastructure

#### MinIO (S3-Compatible Object Storage)
```bash
# Distributed object storage (4 nodes)
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: storage
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: minio
  template: minio
  name: storage
  username: "admin123"
  password: "password123"
  storageSize: "10Gi"
  replicas: 4
  consoleHost: minio.example.com
  apiHost: minio-api.example.com
EOF
```

### 🎨 Creative Tools

#### Midjourney UI
```bash
# AI art generation interface
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: midjourney
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: midjourney-ui
  template: midjourney-ui
  name: midjourney
  host: art.example.com
  apiUrl: "https://api.openai.com/v1"
  apiKey: "sk-your-key"
EOF
```

### ⏰ Task Scheduling

#### Cronicle
```bash
# Web-based task scheduler
cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: scheduler
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: cronicle
  template: cronicle
  name: scheduler
  host: scheduler.example.com
  dataStorageSize: "5Gi"
  logsStorageSize: "5Gi"
  pluginsStorageSize: "1Gi"
EOF
```

### 📈 Data Visualization

#### DataEase
```bash
# Requires external MySQL database first!
# See USAGE.md for database setup

cat <<EOF | kubectl apply -f -
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: dataease
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        template: dataease
  template: dataease
  name: dataease
  host: dataease.example.com
  dbHost: "mysql.default.svc.cluster.local"
  dbPort: "3306"
  dbUser: "dataease"
  dbPassword: "password"
  dbName: "dataease"
EOF
```

## Common Operations

### Check Status
```bash
# List all AP resources
kubectl get ap

# Get details for specific app
kubectl describe ap chatgpt

# Check composed resources
kubectl get deployment,service,ingress -l cloud.sealos.io/deploy-on-sealos=chatgpt-*
```

### View Logs
```bash
# For Deployments
kubectl logs deployment/chatgpt-deployment-xxxx

# For StatefulSets
kubectl logs statefulset/memos-statefulset-xxxx

# For specific pod
kubectl logs chatgpt-deployment-xxxx-yyyyy
```

### Scale Application
```bash
# Edit the AP resource
kubectl edit ap chatgpt

# Change replicas field
spec:
  replicas: 3  # Change from 1 to 3
```

### Update Configuration
```bash
# Edit environment variables or other settings
kubectl edit ap chatgpt

# For example, change API key:
spec:
  openaiApiKey: "sk-new-key"
```

### Delete Application
```bash
# Delete the AP resource (will cascade delete all resources)
kubectl delete ap chatgpt

# Verify deletion
kubectl get deployment,service,ingress -l cloud.sealos.io/deploy-on-sealos=chatgpt-*
```

## DNS Configuration

For all applications, you need to configure DNS to point to your cluster's ingress:

```bash
# Get ingress IP/hostname
kubectl get ingress -A

# For each application, create DNS record:
# A record: chatgpt.example.com -> <ingress-IP>
# or CNAME: chatgpt.example.com -> <ingress-hostname>
```

### Using nip.io for Testing

For quick testing without DNS setup:

```bash
# Get your ingress IP
INGRESS_IP=$(kubectl get ingress -n default chatgpt-ingress-* -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Use nip.io magic DNS
host: chatgpt.${INGRESS_IP}.nip.io

# Example:
# If INGRESS_IP=192.168.1.100
# Use: chatgpt.192.168.1.100.nip.io
```

## Resource Sizing Guidelines

### Development/Testing
```yaml
cpuRequest: "50m"
memoryRequest: "64Mi"
cpuLimit: "500m"
memoryLimit: "512Mi"
storageSize: "1Gi"
```

### Production (Small)
```yaml
cpuRequest: "200m"
memoryRequest: "256Mi"
cpuLimit: "1000m"
memoryLimit: "1024Mi"
storageSize: "10Gi"
```

### Production (Medium)
```yaml
cpuRequest: "500m"
memoryRequest: "512Mi"
cpuLimit: "2000m"
memoryLimit: "2048Mi"
storageSize: "50Gi"
```

### Production (Large)
```yaml
cpuRequest: "1000m"
memoryRequest: "1024Mi"
cpuLimit: "4000m"
memoryLimit: "8192Mi"
storageSize: "100Gi"
```

## Troubleshooting

### AP Not Creating Resources
```bash
# Check AP status
kubectl describe ap <name>

# Check function logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/function=function-go-templating

# Check Crossplane logs
kubectl logs -n crossplane-system -l app=crossplane
```

### Pod Not Starting
```bash
# Check pod status
kubectl get pods -l app=<name>-*

# View pod events
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>
```

### Ingress Not Working
```bash
# Verify ingress exists
kubectl get ingress

# Check ingress details
kubectl describe ingress <name>-ingress-*

# Verify TLS secret exists
kubectl get secret wildcard-cert

# Check nginx ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Storage Issues
```bash
# Check PVCs
kubectl get pvc

# Check PVC status
kubectl describe pvc <pvc-name>

# Check storage class
kubectl get storageclass
```

## Next Steps

- Review [USAGE.md](./USAGE.md) for detailed examples
- See [README.md](./README.md) for conversion patterns
- Check [SESSION_REPORT.md](./SESSION_REPORT.md) for latest updates
- Explore example instance files: `*-instance.yaml`

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the composition YAML for the specific template
3. Look at the example instance file
4. Check Crossplane documentation: https://docs.crossplane.io
5. Review Go templating function docs: https://github.com/crossplane-contrib/function-go-templating

## Security Notes

**Important**: The examples above use plaintext credentials for simplicity. For production:

1. **Use Kubernetes Secrets**:
   ```bash
   kubectl create secret generic chatgpt-creds \
     --from-literal=api-key=sk-your-key \
     --from-literal=password=your-password
   ```

2. **Reference secrets in AP spec** (requires XRD modification)

3. **Use external secret management** (e.g., External Secrets Operator, Vault)

4. **Enable RBAC** and restrict access to namespaces

5. **Use network policies** to isolate applications

6. **Regularly rotate** credentials and update deployments
