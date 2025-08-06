#!/bin/bash

# Cloud-Agnostic Deployment Script for Metrics Dashboard
# Supports AWS EKS, Azure AKS, Google GKE, and on-premises Kubernetes

set -euo pipefail

# Default values
NAMESPACE="metrics-dashboard"
DEPLOYMENT_METHOD="helm"  # helm or manifests
CLOUD_PROVIDER=""  # aws, azure, gcp, onpremises, or auto-detect
IMAGE_TAG="latest"
REGISTRY=""
VALUES_FILE=""
DRY_RUN=false
SKIP_BUILD=false
SKIP_DEPENDENCIES=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build        Build and push container images
    deploy       Deploy the application
    upgrade      Upgrade existing deployment
    cleanup      Remove the deployment
    status       Show deployment status
    logs         Show application logs

Options:
    -c, --cloud PROVIDER     Cloud provider (aws|azure|gcp|onpremises)
    -m, --method METHOD      Deployment method (helm|manifests)
    -r, --registry REGISTRY  Container registry URL
    -t, --tag TAG           Image tag (default: latest)
    -n, --namespace NS      Kubernetes namespace (default: metrics-dashboard)
    -v, --values FILE       Custom values file for Helm
    -d, --dry-run           Dry run mode
    -s, --skip-build        Skip image build
    --skip-deps             Skip dependency installation
    -h, --help              Show this help

Examples:
    # Deploy on AWS EKS with Helm
    $0 deploy -c aws -m helm -r 123456789012.dkr.ecr.us-east-1.amazonaws.com

    # Deploy on Azure AKS with custom values
    $0 deploy -c azure -v values-azure.yaml -r myregistry.azurecr.io

    # Deploy on GCP GKE
    $0 deploy -c gcp -r gcr.io/my-project-id

    # Deploy on-premises with manifests
    $0 deploy -c onpremises -m manifests -r harbor.company.com

    # Build images only
    $0 build -r myregistry.com/metrics-dashboard

    # Clean up deployment
    $0 cleanup
EOF
}

# Function to detect cloud provider
detect_cloud_provider() {
    if [[ -n "$CLOUD_PROVIDER" ]]; then
        return
    fi

    print_status "Auto-detecting cloud provider..."
    
    # Check kubectl context for cloud indicators
    CONTEXT=$(kubectl config current-context 2>/dev/null || echo "")
    
    if [[ "$CONTEXT" =~ .*eks.* ]] || kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' 2>/dev/null | grep -q "aws://"; then
        CLOUD_PROVIDER="aws"
        print_status "Detected AWS EKS"
    elif [[ "$CONTEXT" =~ .*aks.* ]] || kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' 2>/dev/null | grep -q "azure://"; then
        CLOUD_PROVIDER="azure"
        print_status "Detected Azure AKS"
    elif [[ "$CONTEXT" =~ .*gke.* ]] || kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' 2>/dev/null | grep -q "gce://"; then
        CLOUD_PROVIDER="gcp"
        print_status "Detected Google GKE"
    else
        CLOUD_PROVIDER="onpremises"
        print_status "Detected on-premises Kubernetes"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is required but not installed"
        exit 1
    fi
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check Helm if needed
    if [[ "$DEPLOYMENT_METHOD" == "helm" ]]; then
        if ! command -v helm &> /dev/null; then
            print_error "Helm is required but not installed"
            exit 1
        fi
        
        # Check Helm version
        HELM_VERSION=$(helm version --short --client | grep -oE 'v[0-9]+\.[0-9]+' | sed 's/v//')
        if [[ "$(printf '%s\n' "3.0" "$HELM_VERSION" | sort -V | head -n1)" != "3.0" ]]; then
            print_error "Helm 3.x is required"
            exit 1
        fi
    fi
    
    # Check Docker if building
    if [[ "$SKIP_BUILD" == "false" && ("$1" == "build" || "$1" == "deploy") ]]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker is required for building images"
            exit 1
        fi
        
        if ! docker info &> /dev/null; then
            print_error "Docker daemon is not running"
            exit 1
        fi
    fi
    
    print_status "Prerequisites check passed"
}

# Function to set default values based on cloud provider
set_cloud_defaults() {
    case "$CLOUD_PROVIDER" in
        aws)
            if [[ -z "$REGISTRY" ]]; then
                REGISTRY="123456789012.dkr.ecr.us-east-1.amazonaws.com"
                print_warning "Using default AWS ECR registry. Update with your account ID and region."
            fi
            if [[ -z "$VALUES_FILE" ]]; then
                VALUES_FILE="aks/helm/metrics-dashboard/values-aws.yaml"
            fi
            ;;
        azure)
            if [[ -z "$REGISTRY" ]]; then
                REGISTRY="your-acr.azurecr.io"
                print_warning "Using default Azure ACR registry. Update with your registry name."
            fi
            if [[ -z "$VALUES_FILE" ]]; then
                VALUES_FILE="aks/helm/metrics-dashboard/values-azure.yaml"
            fi
            ;;
        gcp)
            if [[ -z "$REGISTRY" ]]; then
                REGISTRY="gcr.io/your-project-id"
                print_warning "Using default GCP GCR registry. Update with your project ID."
            fi
            if [[ -z "$VALUES_FILE" ]]; then
                VALUES_FILE="aks/helm/metrics-dashboard/values-gcp.yaml"
            fi
            ;;
        onpremises)
            if [[ -z "$REGISTRY" ]]; then
                REGISTRY="harbor.company.com"
                print_warning "Using default on-premises registry. Update with your registry URL."
            fi
            if [[ -z "$VALUES_FILE" ]]; then
                VALUES_FILE="aks/helm/metrics-dashboard/values-onpremises.yaml"
            fi
            ;;
    esac
}

# Function to install dependencies
install_dependencies() {
    if [[ "$SKIP_DEPENDENCIES" == "true" ]]; then
        return
    fi
    
    print_status "Installing dependencies..."
    
    case "$CLOUD_PROVIDER" in
        aws)
            # Check AWS Load Balancer Controller
            if ! kubectl get crd targetgroupbindings.elbv2.k8s.aws &> /dev/null; then
                print_warning "AWS Load Balancer Controller not found. Install it for ALB ingress support."
            fi
            
            # Check External Secrets Operator
            if ! kubectl get crd externalsecrets.external-secrets.io &> /dev/null; then
                print_status "Installing External Secrets Operator..."
                helm repo add external-secrets https://charts.external-secrets.io
                helm repo update
                helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
            fi
            ;;
        azure)
            # Check Azure Key Vault Provider
            if ! kubectl get crd secretproviderclasses.secrets-store.csi.x-k8s.io &> /dev/null; then
                print_warning "Secret Store CSI Driver not found. Install it for Azure Key Vault integration."
            fi
            ;;
        gcp)
            # Check External Secrets Operator for GCP
            if ! kubectl get crd externalsecrets.external-secrets.io &> /dev/null; then
                print_status "Installing External Secrets Operator..."
                helm repo add external-secrets https://charts.external-secrets.io
                helm repo update
                helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
            fi
            ;;
    esac
    
    # Common dependencies
    # Cert-manager for TLS certificates
    if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
        print_status "Installing cert-manager..."
        helm repo add jetstack https://charts.jetstack.io
        helm repo update
        helm install cert-manager jetstack/cert-manager \
            --namespace cert-manager \
            --create-namespace \
            --set installCRDs=true
    fi
    
    # Nginx Ingress Controller (if not using cloud-specific ingress)
    if [[ "$CLOUD_PROVIDER" == "onpremises" ]] || [[ "$DEPLOYMENT_METHOD" == "manifests" ]]; then
        if ! kubectl get deployment ingress-nginx-controller -n ingress-nginx &> /dev/null; then
            print_status "Installing nginx-ingress..."
            helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
            helm repo update
            helm install ingress-nginx ingress-nginx/ingress-nginx \
                --namespace ingress-nginx \
                --create-namespace
        fi
    fi
}

# Function to build and push images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        print_status "Skipping image build"
        return
    fi
    
    print_header "Building and pushing container images"
    
    # Build backend image
    print_status "Building backend image..."
    docker build -t "${REGISTRY}/metrics-dashboard-backend:${IMAGE_TAG}" \
        -f backend/Dockerfile backend/
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -t "${REGISTRY}/metrics-dashboard-frontend:${IMAGE_TAG}" \
        -f frontend/Dockerfile frontend/
    
    # Push images
    print_status "Pushing images to registry..."
    
    # Login to registry based on cloud provider
    case "$CLOUD_PROVIDER" in
        aws)
            aws ecr get-login-password --region "${AWS_REGION:-us-east-1}" | \
                docker login --username AWS --password-stdin "$REGISTRY"
            ;;
        azure)
            az acr login --name "$(echo "$REGISTRY" | cut -d'.' -f1)"
            ;;
        gcp)
            gcloud auth configure-docker
            ;;
        onpremises)
            print_warning "Please ensure you are logged into your registry: $REGISTRY"
            ;;
    esac
    
    docker push "${REGISTRY}/metrics-dashboard-backend:${IMAGE_TAG}"
    docker push "${REGISTRY}/metrics-dashboard-frontend:${IMAGE_TAG}"
    
    print_status "Images built and pushed successfully"
}

# Function to deploy with Helm
deploy_with_helm() {
    print_header "Deploying with Helm"
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Prepare Helm command
    HELM_CMD="helm"
    if [[ "$DRY_RUN" == "true" ]]; then
        HELM_CMD="$HELM_CMD --dry-run"
    fi
    
    # Install or upgrade
    if helm list -n "$NAMESPACE" | grep -q "metrics-dashboard"; then
        print_status "Upgrading existing Helm release..."
        $HELM_CMD upgrade metrics-dashboard aks/helm/metrics-dashboard \
            --namespace "$NAMESPACE" \
            --set global.imageRegistry="$REGISTRY" \
            --set image.backend.tag="$IMAGE_TAG" \
            --set image.frontend.tag="$IMAGE_TAG" \
            --set global.cloudProvider="$CLOUD_PROVIDER" \
            -f "aks/helm/metrics-dashboard/values.yaml" \
            ${VALUES_FILE:+-f "$VALUES_FILE"}
    else
        print_status "Installing new Helm release..."
        $HELM_CMD install metrics-dashboard aks/helm/metrics-dashboard \
            --namespace "$NAMESPACE" \
            --create-namespace \
            --set global.imageRegistry="$REGISTRY" \
            --set image.backend.tag="$IMAGE_TAG" \
            --set image.frontend.tag="$IMAGE_TAG" \
            --set global.cloudProvider="$CLOUD_PROVIDER" \
            -f "aks/helm/metrics-dashboard/values.yaml" \
            ${VALUES_FILE:+-f "$VALUES_FILE"}
    fi
}

# Function to deploy with manifests
deploy_with_manifests() {
    print_header "Deploying with Kubernetes manifests"
    
    # Create temporary directory for processed manifests
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # Copy manifests and replace placeholders
    cp -r aks/manifests/* "$TEMP_DIR/"
    
    # Replace image placeholders
    find "$TEMP_DIR" -name "*.yaml" -exec sed -i.bak \
        -e "s|{{REGISTRY}}|$REGISTRY|g" \
        -e "s|{{IMAGE_TAG}}|$IMAGE_TAG|g" \
        -e "s|{{NAMESPACE}}|$NAMESPACE|g" \
        -e "s|{{CLOUD_PROVIDER}}|$CLOUD_PROVIDER|g" {} \;
    
    # Apply manifests
    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl apply -f "$TEMP_DIR" --dry-run=client
    else
        kubectl apply -f "$TEMP_DIR"
    fi
}

# Function to show deployment status
show_status() {
    print_header "Deployment Status"
    
    echo "Namespace: $NAMESPACE"
    echo "Cloud Provider: $CLOUD_PROVIDER"
    echo
    
    # Pods
    print_status "Pods:"
    kubectl get pods -n "$NAMESPACE"
    echo
    
    # Services
    print_status "Services:"
    kubectl get services -n "$NAMESPACE"
    echo
    
    # Ingress
    print_status "Ingress:"
    kubectl get ingress -n "$NAMESPACE"
    echo
    
    # Helm releases (if applicable)
    if command -v helm &> /dev/null; then
        print_status "Helm Releases:"
        helm list -n "$NAMESPACE"
    fi
}

# Function to show logs
show_logs() {
    print_header "Application Logs"
    
    DEPLOYMENT="metrics-dashboard"
    if kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" &> /dev/null; then
        print_status "Backend logs:"
        kubectl logs -n "$NAMESPACE" deployment/"$DEPLOYMENT" -c backend --tail=50
        echo
        print_status "Frontend logs:"
        kubectl logs -n "$NAMESPACE" deployment/"$DEPLOYMENT" -c frontend --tail=50
    else
        print_error "Deployment $DEPLOYMENT not found in namespace $NAMESPACE"
        exit 1
    fi
}

# Function to cleanup deployment
cleanup_deployment() {
    print_header "Cleaning up deployment"
    
    if [[ "$DEPLOYMENT_METHOD" == "helm" ]]; then
        if helm list -n "$NAMESPACE" | grep -q "metrics-dashboard"; then
            helm uninstall metrics-dashboard -n "$NAMESPACE"
        fi
    else
        kubectl delete -f aks/manifests/ || true
    fi
    
    # Optionally delete namespace
    read -p "Delete namespace $NAMESPACE? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace "$NAMESPACE"
    fi
    
    print_status "Cleanup completed"
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        build|deploy|upgrade|cleanup|status|logs)
            COMMAND="$1"
            shift
            ;;
        -c|--cloud)
            CLOUD_PROVIDER="$2"
            shift 2
            ;;
        -m|--method)
            DEPLOYMENT_METHOD="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -v|--values)
            VALUES_FILE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPENDENCIES=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    print_error "No command specified"
    show_usage
    exit 1
fi

# Main execution
main() {
    print_header "Metrics Dashboard Cloud-Agnostic Deployment"
    
    # Detect cloud provider if not specified
    detect_cloud_provider
    
    # Set cloud-specific defaults
    set_cloud_defaults
    
    # Check prerequisites
    check_prerequisites "$COMMAND"
    
    # Execute command
    case "$COMMAND" in
        build)
            build_images
            ;;
        deploy)
            install_dependencies
            if [[ "$SKIP_BUILD" == "false" ]]; then
                build_images
            fi
            if [[ "$DEPLOYMENT_METHOD" == "helm" ]]; then
                deploy_with_helm
            else
                deploy_with_manifests
            fi
            print_status "Deployment completed successfully!"
            show_status
            ;;
        upgrade)
            if [[ "$SKIP_BUILD" == "false" ]]; then
                build_images
            fi
            if [[ "$DEPLOYMENT_METHOD" == "helm" ]]; then
                deploy_with_helm
            else
                deploy_with_manifests
            fi
            print_status "Upgrade completed successfully!"
            show_status
            ;;
        cleanup)
            cleanup_deployment
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
    esac
}

# Run main function
main
