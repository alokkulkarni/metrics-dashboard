# Azure Kubernetes Service (AKS) Deployment

This directory contains all the necessary files and configurations to deploy the Metrics Dashboard application on Azure Kubernetes Service (AKS) with production-ready security and scalability features.

## 🏗️ Architecture Overview

The AKS deployment uses a **single-pod architecture** where both frontend (nginx) and backend (Node.js) containers run in the same pod, enabling:

- **Optimal Performance**: Direct localhost communication between frontend and backend
- **Simplified Networking**: No inter-pod communication overhead
- **Shared Resources**: Efficient resource utilization
- **Simplified Deployment**: Single deployment unit to manage

### Key Components

- **Frontend Container**: nginx serving React application
- **Backend Container**: Node.js API server
- **Azure Database for PostgreSQL**: Managed database service
- **Azure Key Vault**: Secure secret management
- **Azure Container Registry**: Private container registry
- **Azure Application Gateway**: Load balancer and SSL termination

## 📁 Directory Structure

```
aks/
├── manifests/                    # Kubernetes YAML manifests
│   ├── 00-namespace.yaml        # Namespace and resource quotas
│   ├── 01-configmap.yaml        # Application configuration
│   ├── 02-secrets.yaml          # Azure Key Vault integration
│   ├── 03-pvc.yaml              # Persistent volume claims
│   ├── 04-deployment.yaml       # Main application deployment
│   ├── 05-service.yaml          # Kubernetes services
│   ├── 06-ingress.yaml          # Ingress configuration
│   ├── 07-autoscaling.yaml      # HPA and VPA configuration
│   ├── 08-rbac.yaml             # RBAC permissions
│   └── 09-monitoring.yaml       # Prometheus/Grafana setup
├── helm/                        # Helm chart for deployment
│   └── metrics-dashboard/
│       ├── Chart.yaml           # Helm chart metadata
│       ├── values.yaml          # Default configuration values
│       └── templates/           # Helm templates
├── supervisor/                  # Process management for combined container
│   └── supervisord.conf         # Supervisor configuration
├── deploy.sh                    # Deployment automation script
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and logged in
2. **kubectl** configured for your AKS cluster
3. **Helm 3.x** installed
4. **Docker** for building images
5. **AKS cluster** with the following addons:
   - Azure Key Vault Provider for Secrets Store CSI Driver
   - Application Gateway Ingress Controller (optional)
   - Azure Monitor for containers

### Step 1: Setup Azure Resources

Before deploying, create the required Azure resources:

```bash
# Create Resource Group
az group create --name metrics-dashboard-rg --location eastus

# Create Azure Container Registry
az acr create --resource-group metrics-dashboard-rg \
  --name your-acr --sku Standard

# Create Azure Database for PostgreSQL
az postgres flexible-server create \
  --resource-group metrics-dashboard-rg \
  --name metrics-db-server \
  --admin-user azureuser \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 15

# Create Azure Key Vault
az keyvault create \
  --resource-group metrics-dashboard-rg \
  --name metrics-kv \
  --location eastus
```

### Step 2: Configure Secrets

Store sensitive configuration in Azure Key Vault:

```bash
# Database password
az keyvault secret set --vault-name metrics-kv \
  --name db-password --value "YourSecurePassword123!"

# JWT secret
az keyvault secret set --vault-name metrics-kv \
  --name jwt-secret --value "your-super-secret-jwt-key"

# Jira configuration
az keyvault secret set --vault-name metrics-kv \
  --name jira-api-token --value "your-jira-api-token"

az keyvault secret set --vault-name metrics-kv \
  --name jira-email --value "your-email@company.com"

az keyvault secret set --vault-name metrics-kv \
  --name jira-base-url --value "https://your-company.atlassian.net"
```

### Step 3: Deploy Using Deployment Script

The easiest way to deploy is using the provided script:

```bash
# Make the script executable
chmod +x aks/deploy.sh

# Deploy using Helm (recommended)
./aks/deploy.sh deploy helm your-acr latest

# Or deploy using raw manifests
./aks/deploy.sh deploy manifests your-acr latest
```

### Step 4: Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build and push images
./aks/deploy.sh build your-acr latest

# Apply manifests
kubectl apply -f aks/manifests/

# Or use Helm
helm install metrics-dashboard aks/helm/metrics-dashboard \
  --namespace metrics-dashboard \
  --create-namespace \
  --values aks/helm/metrics-dashboard/values.yaml
```

## ⚙️ Configuration

### Helm Values

Key configuration values in `helm/metrics-dashboard/values.yaml`:

```yaml
# Image configuration
global:
  imageRegistry: "your-acr.azurecr.io"

# Scaling configuration
replicaCount: 3
maxReplicas: 10

# Azure integration
azure:
  database:
    host: "metrics-db-server.postgres.database.azure.com"
  keyVault:
    name: "metrics-kv"
  
# Ingress configuration
ingress:
  hosts:
    - host: metrics-dashboard.example.com
```

### Environment-Specific Configurations

Create environment-specific values files:

```bash
# Production values
helm install metrics-dashboard aks/helm/metrics-dashboard \
  -f aks/helm/metrics-dashboard/values.yaml \
  -f aks/helm/metrics-dashboard/values-prod.yaml

# Staging values
helm install metrics-dashboard aks/helm/metrics-dashboard \
  -f aks/helm/metrics-dashboard/values.yaml \
  -f aks/helm/metrics-dashboard/values-staging.yaml
```

## 🔒 Security Features

### Production Security Configurations

- **Non-root containers**: All containers run as non-root users
- **Read-only root filesystem**: Enhanced container security
- **Security contexts**: Proper Linux capabilities and user contexts
- **Network policies**: Restricted pod-to-pod communication
- **RBAC**: Least-privilege access controls
- **Pod Security Standards**: Enforced security policies
- **Azure Key Vault integration**: Secure secret management
- **TLS encryption**: End-to-end encryption

### Secret Management

Secrets are managed through Azure Key Vault with automatic injection:

```yaml
# Secrets are automatically mounted from Key Vault
volumeMounts:
- name: secrets-store
  mountPath: /mnt/secrets-store
  readOnly: true
```

## 📊 Monitoring and Observability

### Prometheus Integration

The deployment includes:

- **ServiceMonitor**: Automatic Prometheus scraping
- **PrometheusRule**: Alerting rules for common issues
- **Grafana Dashboard**: Pre-configured dashboard

### Azure Monitor Integration

- **Application Insights**: Application performance monitoring
- **Container Insights**: Container-level monitoring
- **Log Analytics**: Centralized logging

### Health Checks

Multiple health check endpoints:

- **Liveness Probe**: `/health` - Container health
- **Readiness Probe**: `/ready` - Service readiness  
- **Startup Probe**: `/health` - Initial startup health

## 🔄 Scaling and High Availability

### Horizontal Pod Autoscaler (HPA)

Automatic scaling based on:
- CPU utilization (70% threshold)
- Memory utilization (80% threshold)
- Custom metrics (requests per second)

### Pod Disruption Budget

Ensures minimum availability during updates:
- Minimum 2 pods available during disruptions
- Rolling update strategy with 1 pod max unavailable

### Anti-Affinity Rules

Pods are distributed across nodes for high availability:
- Soft anti-affinity (preferred)
- Hard anti-affinity (required) - optional

## 🚀 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy new version to staging namespace
helm install metrics-dashboard-green aks/helm/metrics-dashboard \
  --namespace metrics-dashboard-staging

# Test the green deployment
# Switch traffic using ingress or service mesh

# Remove old deployment
helm uninstall metrics-dashboard-blue
```

### Canary Deployment

Use Flagger or Argo Rollouts for automated canary deployments:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: metrics-dashboard
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: metrics-dashboard
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
```

## 🔧 Troubleshooting

### Common Issues

1. **Pod stuck in Pending state**
   ```bash
   kubectl describe pod -n metrics-dashboard
   kubectl get events -n metrics-dashboard
   ```

2. **Secret Store CSI issues**
   ```bash
   kubectl logs -n kube-system -l app=secrets-store-csi-driver
   ```

3. **Database connectivity issues**
   ```bash
   kubectl exec -it deployment/metrics-dashboard -n metrics-dashboard -- nc -zv metrics-db-server.postgres.database.azure.com 5432
   ```

### Debug Commands

```bash
# Check pod logs
kubectl logs -f deployment/metrics-dashboard -n metrics-dashboard -c backend

# Get shell access
kubectl exec -it deployment/metrics-dashboard -n metrics-dashboard -- /bin/sh

# Check resource usage
kubectl top pods -n metrics-dashboard

# Verify service discovery
kubectl get endpoints -n metrics-dashboard
```

## 📝 Maintenance

### Update Deployment

```bash
# Update Helm deployment
helm upgrade metrics-dashboard aks/helm/metrics-dashboard \
  --namespace metrics-dashboard \
  --values aks/helm/metrics-dashboard/values.yaml

# Restart deployment
kubectl rollout restart deployment/metrics-dashboard -n metrics-dashboard

# Check rollout status
kubectl rollout status deployment/metrics-dashboard -n metrics-dashboard
```

### Backup and Restore

```bash
# Backup namespace resources
kubectl get all,configmaps,secrets,pvc -n metrics-dashboard -o yaml > backup.yaml

# Restore from backup
kubectl apply -f backup.yaml
```

## 🧹 Cleanup

```bash
# Use the deployment script
./aks/deploy.sh cleanup

# Or manual cleanup
helm uninstall metrics-dashboard -n metrics-dashboard
kubectl delete namespace metrics-dashboard
```

## 📚 Additional Resources

- [Azure Kubernetes Service Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Azure Key Vault Provider for Secrets Store CSI Driver](https://azure.github.io/secrets-store-csi-driver-provider-azure/)

## 🤝 Contributing

1. Update configurations in the appropriate files
2. Test changes in a development environment
3. Update documentation as needed
4. Submit pull request with detailed description

## 📞 Support

For issues related to AKS deployment:
- Check troubleshooting section above
- Review pod logs and events
- Contact platform team: platform-team@company.com
