#!/bin/bash
# AKS Deployment Script for Metrics Dashboard
# This script provides a complete deployment workflow for the Metrics Dashboard on AKS

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="metrics-dashboard"
RELEASE_NAME="metrics-dashboard"
HELM_CHART_PATH="$PROJECT_ROOT/aks/helm/metrics-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install Helm first."
        exit 1
    fi
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install Azure CLI first."
        exit 1
    fi
    
    # Check if connected to AKS cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Not connected to a Kubernetes cluster. Please configure kubectl."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f "$PROJECT_ROOT/aks/manifests/00-namespace.yaml"
        log_success "Namespace $NAMESPACE created"
    fi
}

# Deploy using raw manifests
deploy_manifests() {
    log_info "Deploying using Kubernetes manifests..."
    
    # Apply manifests in order
    for manifest in "$PROJECT_ROOT/aks/manifests"/*.yaml; do
        log_info "Applying $(basename "$manifest")..."
        kubectl apply -f "$manifest"
    done
    
    log_success "All manifests applied successfully!"
}

# Deploy using Helm
deploy_helm() {
    log_info "Deploying using Helm chart..."
    
    # Update Helm dependencies
    helm dependency update "$HELM_CHART_PATH"
    
    # Install or upgrade the Helm release
    helm upgrade --install "$RELEASE_NAME" "$HELM_CHART_PATH" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --wait \
        --timeout 10m \
        --values "$HELM_CHART_PATH/values.yaml"
    
    log_success "Helm deployment completed successfully!"
}

# Build and push images to ACR
build_and_push_images() {
    local acr_name="${1:-your-acr}"
    local tag="${2:-latest}"
    
    log_info "Building and pushing images to ACR: $acr_name"
    
    # Login to ACR
    az acr login --name "$acr_name"
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -t "$acr_name.azurecr.io/metrics-dashboard-frontend:$tag" \
        -f "$PROJECT_ROOT/frontend/Dockerfile" \
        "$PROJECT_ROOT/frontend"
    
    # Build backend image
    log_info "Building backend image..."
    docker build -t "$acr_name.azurecr.io/metrics-dashboard-backend:$tag" \
        -f "$PROJECT_ROOT/backend/Dockerfile" \
        "$PROJECT_ROOT/backend"
    
    # Build combined image for AKS
    log_info "Building combined AKS image..."
    docker build -t "$acr_name.azurecr.io/metrics-dashboard:$tag" \
        -f "$PROJECT_ROOT/Dockerfile.aks" \
        "$PROJECT_ROOT"
    
    # Push images
    log_info "Pushing images to ACR..."
    docker push "$acr_name.azurecr.io/metrics-dashboard-frontend:$tag"
    docker push "$acr_name.azurecr.io/metrics-dashboard-backend:$tag"
    docker push "$acr_name.azurecr.io/metrics-dashboard:$tag"
    
    log_success "Images built and pushed successfully!"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -l app=metrics-dashboard
    
    # Check service status
    log_info "Checking service status..."
    kubectl get services -n "$NAMESPACE"
    
    # Check ingress status
    log_info "Checking ingress status..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=metrics-dashboard -n "$NAMESPACE" --timeout=300s
    
    # Check if application is responding
    log_info "Checking application health..."
    if kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' &> /dev/null; then
        local host=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}')
        log_info "Application should be available at: https://$host"
    fi
    
    log_success "Deployment verification completed!"
}

# Cleanup deployment
cleanup() {
    log_info "Cleaning up deployment..."
    
    # Delete Helm release
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        helm uninstall "$RELEASE_NAME" -n "$NAMESPACE"
        log_success "Helm release deleted"
    fi
    
    # Delete namespace
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        kubectl delete namespace "$NAMESPACE"
        log_success "Namespace deleted"
    fi
    
    log_success "Cleanup completed!"
}

# Setup Azure resources (placeholder)
setup_azure_resources() {
    log_info "Setting up Azure resources..."
    log_warning "This is a placeholder. Please set up the following Azure resources manually:"
    echo "  - Azure Database for PostgreSQL Flexible Server"
    echo "  - Azure Key Vault"
    echo "  - Azure Container Registry"
    echo "  - Azure Application Gateway (if using AGIC)"
    echo "  - Azure Monitor / Application Insights"
    echo ""
    log_info "Or use the Bicep/Terraform templates in the infra/ directory"
}

# Main deployment function
deploy() {
    local deployment_method="${1:-helm}"
    local acr_name="${2:-your-acr}"
    local tag="${3:-latest}"
    
    log_info "Starting deployment with method: $deployment_method"
    
    check_prerequisites
    setup_azure_resources
    create_namespace
    
    if [[ "$deployment_method" == "helm" ]]; then
        deploy_helm
    elif [[ "$deployment_method" == "manifests" ]]; then
        deploy_manifests
    else
        log_error "Invalid deployment method. Use 'helm' or 'manifests'"
        exit 1
    fi
    
    verify_deployment
    log_success "Deployment completed successfully!"
}

# Print usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy [helm|manifests] [acr-name] [tag]  Deploy the application"
    echo "  build [acr-name] [tag]                    Build and push images"
    echo "  verify                                    Verify existing deployment"
    echo "  cleanup                                   Clean up deployment"
    echo "  help                                      Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 deploy helm my-acr latest"
    echo "  $0 build my-acr v1.0.0"
    echo "  $0 verify"
    echo "  $0 cleanup"
}

# Main script logic
case "${1:-help}" in
    deploy)
        deploy "${2:-helm}" "${3:-your-acr}" "${4:-latest}"
        ;;
    build)
        check_prerequisites
        build_and_push_images "${2:-your-acr}" "${3:-latest}"
        ;;
    verify)
        check_prerequisites
        verify_deployment
        ;;
    cleanup)
        check_prerequisites
        cleanup
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        usage
        exit 1
        ;;
esac
