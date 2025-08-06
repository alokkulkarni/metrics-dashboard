# Metrics Dashboard - AKS Deployment

This directory contains the Kubernetes/AKS deployment configuration for the Metrics Dashboard application.

## 🚀 Quick Start

The application has been successfully deployed to your Kubernetes cluster with the following components:

- **Frontend**: React application served by nginx
- **Backend**: Node.js API server 
- **Database**: Embedded PostgreSQL with persistent storage
- **Networking**: Configured with proper CORS and API routing

## 📋 Current Status

✅ **Infrastructure**: All components deployed and running  
✅ **API Endpoints**: All endpoints responding correctly  
✅ **CORS**: Cross-origin requests working  
✅ **Database**: Connected with successful migrations  
🟡 **Jira Integration**: Requires credential configuration  

## 🔧 Jira Configuration Required

The application is running but needs actual Jira credentials to sync data. Currently, the secrets contain placeholder values.

### Current Placeholder Values
```yaml
secrets:
  jira:
    baseUrl: "https://your-domain.atlassian.net"
    email: "your-email@example.com" 
    apiToken: "your-jira-api-token-here"
```

### To Configure Real Jira Credentials

**Option 1: Update values.yaml (for development)**
```bash
# Edit the values file
vim ./helm/metrics-dashboard/values.yaml

# Update the secrets section:
secrets:
  jira:
    baseUrl: "https://YOUR-COMPANY.atlassian.net"
    email: "your-actual-email@company.com"
    apiToken: "ATATT3xFfGF0T..."  # Your actual Jira API token

# Upgrade the deployment
helm upgrade metrics-dashboard ./helm/metrics-dashboard -n metrics-dashboard
```

**Option 2: Use Helm command-line overrides (more secure)**
```bash
helm upgrade metrics-dashboard ./helm/metrics-dashboard -n metrics-dashboard \
  --set secrets.jira.baseUrl="https://YOUR-COMPANY.atlassian.net" \
  --set secrets.jira.email="your-email@company.com" \
  --set secrets.jira.apiToken="ATATT3xFfGF0T..."
```

**Option 3: Create a separate values file (recommended for production)**
```bash
# Create a separate file with your credentials
cat > jira-values.yaml << EOF
secrets:
  jira:
    baseUrl: "https://YOUR-COMPANY.atlassian.net"
    email: "your-email@company.com"
    apiToken: "ATATT3xFfGF0T..."
EOF

# Deploy with the override file
helm upgrade metrics-dashboard ./helm/metrics-dashboard -n metrics-dashboard -f jira-values.yaml

# Add to .gitignore to keep credentials out of version control
echo "jira-values.yaml" >> .gitignore
```

### How to Get Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "Metrics Dashboard")
4. Copy the generated token
5. Use this token as the `apiToken` value

## 🌐 Accessing the Application

The application is accessible via port-forward:

```bash
# Start port-forward (if not already running)
kubectl port-forward -n metrics-dashboard svc/metrics-dashboard 8083:80

# Access the application
open http://localhost:8083
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│    Frontend     │    │     Backend     │    │   PostgreSQL    │
│   (React/nginx) │◄──►│   (Node.js)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                     ┌─────────────────┐
                     │                 │
                     │   Jira Cloud    │
                     │      API        │
                     │                 │
                     └─────────────────┘
```

## 📊 API Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/health` | GET | Health check | ✅ Working |
| `/api/boards` | GET | List all boards | ✅ Working |
| `/api/boards/stats` | GET | Board statistics | ✅ Working |
| `/api/sync` | POST | Sync Jira data | 🟡 Needs Jira config |
| `/api/metrics/calculate` | POST | Calculate metrics | ✅ Working |

## 🔍 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n metrics-dashboard
```

### View Backend Logs
```bash
kubectl logs -f deployment/metrics-dashboard -n metrics-dashboard -c backend
```

### View Frontend Logs  
```bash
kubectl logs -f deployment/metrics-dashboard -n metrics-dashboard -c frontend
```

### Check Secrets
```bash
kubectl describe secret metrics-dashboard-secret -n metrics-dashboard
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:8083/api/health

# Board stats
curl http://localhost:8083/api/boards/stats

# Sync (will show Jira connection error until configured)
curl -X POST http://localhost:8083/api/sync
```

## 🔄 Common Operations

### Restart Deployment
```bash
kubectl rollout restart deployment/metrics-dashboard -n metrics-dashboard
```

### Scale Application
```bash
kubectl scale deployment metrics-dashboard -n metrics-dashboard --replicas=2
```

### View Resource Usage
```bash
kubectl top pods -n metrics-dashboard
```

## 🧹 Cleanup

To remove the entire deployment:
```bash
helm uninstall metrics-dashboard -n metrics-dashboard
kubectl delete namespace metrics-dashboard
```

## 📝 Next Steps

1. **Configure Jira credentials** using one of the methods above
2. **Test data sync** by clicking "Sync Data" in the UI
3. **Monitor logs** to ensure successful Jira connection
4. **Configure additional Jira projects** in the UI as needed

## 🔒 Security Notes

- Keep Jira API tokens secure and never commit them to version control
- Consider using Kubernetes secrets with external secret management tools for production
- Regularly rotate API tokens according to your security policy
- Monitor access logs for any unauthorized API usage

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify Jira credentials are correctly configured
3. Ensure your Jira instance is accessible from the cluster
4. Check network policies and firewall rules if applicable

---

**Deployment Status**: ✅ Infrastructure Ready - Requires Jira Configuration
