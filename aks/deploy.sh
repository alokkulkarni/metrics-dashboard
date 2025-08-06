#!/bin/bash
# Multi-Platform Deployment Script for Metrics Dashboard
# Supports minikube, AWS EKS, and Azure AKS

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="metrics-dashboard"
RELEASE_NAME="metrics-dashboard"
HELM_CHART_PATH="$SCRIPT_DIR/helm/metrics-dashboard"

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

# Show usage
show_usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
  deploy <platform>     Deploy to specified platform (minikube, aws, azure)
  build <platform>      Build images for specified platform
  cleanup              Remove deployment
  status               Check deployment status
  logs                 View application logs

Platforms:
  minikube             Local minikube deployment with embedded PostgreSQL
  aws                  AWS EKS deployment with external RDS
  azure                Azure AKS deployment with Azure Database

Options:
  -n, --namespace      Kubernetes namespace (default: metrics-dashboard)
  -r, --registry       Container registry URL
  -t, --tag           Image tag (default: latest)
  -h, --help          Show this help

Examples:
  $0 deploy minikube
  $0 deploy aws -r 123456789012.dkr.ecr.us-east-1.amazonaws.com
  $0 deploy azure -r youracr.azurecr.io
  $0 build minikube
  $0 cleanup
  $0 status
  $0 logs

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed"
        exit 1
    fi
    
    # Check docker for build operations
    if [[ "$1" == "build" ]] || [[ "$2" == "minikube" ]]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Build images for platform
build_images() {
    local platform=$1
    local registry=${2:-""}
    local tag=${3:-"latest"}
    
    log_info "Building images for platform: $platform"
    
    case $platform in
        minikube)
            # For minikube, build images in minikube's docker environment
            log_info "Setting up minikube docker environment..."
            eval $(minikube docker-env)
            
            log_info "Building frontend image..."
            docker build -t metrics-dashboard-frontend:$tag -f frontend/Dockerfile frontend/
            
            log_info "Building backend image..."
            docker build -t metrics-dashboard-backend:$tag -f backend/Dockerfile backend/
            ;;
            
        aws)
            if [[ -z "$registry" ]]; then
                log_error "Registry URL required for AWS deployment"
                exit 1
            fi
            
            # Build and push to ECR
            log_info "Building and pushing to ECR: $registry"
            
            # Login to ECR
            aws ecr get-login-password --region $(echo $registry | cut -d'.' -f4) | docker login --username AWS --password-stdin $registry
            
            # Build and push frontend
            docker build -t $registry/metrics-dashboard-frontend:$tag -f frontend/Dockerfile frontend/
            docker push $registry/metrics-dashboard-frontend:$tag
            
            # Build and push backend
            docker build -t $registry/metrics-dashboard-backend:$tag -f backend/Dockerfile backend/
            docker push $registry/metrics-dashboard-backend:$tag
            ;;
            
        azure)
            if [[ -z "$registry" ]]; then
                log_error "Registry URL required for Azure deployment"
                exit 1
            fi
            
            # Build and push to ACR
            log_info "Building and pushing to ACR: $registry"
            
            # Login to ACR
            az acr login --name $(echo $registry | cut -d'.' -f1)
            
            # Build and push frontend
            docker build -t $registry/metrics-dashboard-frontend:$tag -f frontend/Dockerfile frontend/
            docker push $registry/metrics-dashboard-frontend:$tag
            
            # Build and push backend
            docker build -t $registry/metrics-dashboard-backend:$tag -f backend/Dockerfile backend/
            docker push $registry/metrics-dashboard-backend:$tag
            ;;
            
        *)
            log_error "Unknown platform: $platform"
            exit 1
            ;;
    esac
    
    log_success "Images built successfully for $platform"
}

# Deploy to platform
deploy() {
    local platform=$1
    local registry=${2:-""}
    local tag=${3:-"latest"}
    
    log_info "Deploying to platform: $platform"
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Prepare helm values
    local values_file="$HELM_CHART_PATH/values-$platform.yaml"
    local helm_args=()
    
    # Base values
    helm_args+=("-f" "$HELM_CHART_PATH/values.yaml")
    
    # Platform-specific values
    if [[ -f "$values_file" ]]; then
        helm_args+=("-f" "$values_file")
    else
        log_warning "Platform-specific values file not found: $values_file"
    fi
    
    # Override registry if provided
    if [[ -n "$registry" ]]; then
        helm_args+=("--set" "global.imageRegistry=$registry")
    fi
    
    # Override tag if provided
    if [[ "$tag" != "latest" ]]; then
        helm_args+=("--set" "app.frontend.image.tag=$tag")
        helm_args+=("--set" "app.backend.image.tag=$tag")
    fi
    
    # Platform-specific setup
    case $platform in
        minikube)
            log_info "Setting up for minikube deployment..."
            # Ensure minikube is running
            if ! minikube status &> /dev/null; then
                log_error "Minikube is not running. Start it with 'minikube start'"
                exit 1
            fi
            ;;
            
        aws)
            log_info "Setting up for AWS EKS deployment..."
            # Verify kubectl context is pointing to EKS
            if ! kubectl config current-context | grep -q "arn:aws:eks"; then
                log_warning "Current kubectl context doesn't appear to be EKS"
            fi
            ;;
            
        azure)
            log_info "Setting up for Azure AKS deployment..."
            # Verify kubectl context is pointing to AKS
            if ! kubectl config current-context | grep -q "aks"; then
                log_warning "Current kubectl context doesn't appear to be AKS"
            fi
            ;;
    esac
    
    # Deploy with Helm
    log_info "Installing/upgrading with Helm..."
    helm upgrade --install $RELEASE_NAME $HELM_CHART_PATH \
        --namespace $NAMESPACE \
        "${helm_args[@]}" \
        --wait \
        --timeout=10m
    
    log_success "Deployment completed successfully"
    
    # Show access information
    show_access_info $platform
}

# Show access information
show_access_info() {
    local platform=$1
    
    log_info "Getting access information..."
    
    case $platform in
        minikube)
            # Check if ingress is enabled
            if kubectl get ingress -n $NAMESPACE &> /dev/null; then
                local ingress_ip=$(minikube ip)
                log_info "Access the application at: http://metrics-dashboard.local"
                log_info "Add to /etc/hosts: echo '$ingress_ip metrics-dashboard.local' | sudo tee -a /etc/hosts"
            else
                log_info "Port-forward to access the application:"
                log_info "kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME 8080:80"
                log_info "Then visit: http://localhost:8080"
            fi
            ;;
            
        aws|azure)
            # Check for ingress
            if kubectl get ingress -n $NAMESPACE &> /dev/null; then
                local ingress_host=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}')
                if [[ -n "$ingress_host" ]]; then
                    log_info "Access the application at: https://$ingress_host"
                else
                    log_info "Ingress configured, waiting for external IP..."
                fi
            else
                log_info "Port-forward to access the application:"
                log_info "kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME 8080:80"
            fi
            ;;
    esac
}

# Check deployment status
check_status() {
    log_info "Checking deployment status..."
    
    echo ""
    echo "=== Pods ==="
    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=metrics-dashboard
    
    echo ""
    echo "=== Services ==="
    kubectl get svc -n $NAMESPACE
    
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress found"
    
    echo ""
    echo "=== PVCs ==="
    kubectl get pvc -n $NAMESPACE 2>/dev/null || echo "No PVCs found"
    
    # Check if deployment is ready
    if kubectl rollout status deployment/$RELEASE_NAME -n $NAMESPACE --timeout=30s &> /dev/null; then
        log_success "Deployment is ready"
    else
        log_warning "Deployment is not ready yet"
    fi
}

# View logs
view_logs() {
    log_info "Viewing application logs..."
    
    echo ""
    echo "=== Backend Logs ==="
    kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=metrics-dashboard -c backend --tail=50
    
    echo ""
    echo "=== Frontend Logs ==="
    kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=metrics-dashboard -c frontend --tail=50
    
    echo ""
    echo "=== PostgreSQL Logs (if embedded) ==="
    kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=metrics-dashboard -c postgres --tail=20 2>/dev/null || echo "No embedded PostgreSQL found"
}

# Cleanup deployment
cleanup() {
    log_info "Cleaning up deployment..."
    
    # Remove Helm release
    if helm list -n $NAMESPACE | grep -q $RELEASE_NAME; then
        helm uninstall $RELEASE_NAME -n $NAMESPACE
        log_success "Helm release removed"
    else
        log_info "No Helm release found"
    fi
    
    # Remove PVCs (ask for confirmation)
    if kubectl get pvc -n $NAMESPACE &> /dev/null; then
        echo ""
        read -p "Remove persistent volumes? This will delete all data. (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete pvc --all -n $NAMESPACE
            log_success "PVCs removed"
        fi
    fi
    
    # Remove namespace (ask for confirmation)
    echo ""
    read -p "Remove namespace '$NAMESPACE'? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace $NAMESPACE
        log_success "Namespace removed"
    fi
}

# Main function
main() {
    local command=""
    local platform=""
    local registry=""
    local tag="latest"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|build|cleanup|status|logs)
                command=$1
                shift
                ;;
            minikube|aws|azure)
                platform=$1
                shift
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -r|--registry)
                registry="$2"
                shift 2
                ;;
            -t|--tag)
                tag="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate command
    if [[ -z "$command" ]]; then
        log_error "Command required"
        show_usage
        exit 1
    fi
    
    # Execute command
    case $command in
        deploy)
            if [[ -z "$platform" ]]; then
                log_error "Platform required for deploy command"
                show_usage
                exit 1
            fi
            check_prerequisites deploy $platform
            deploy $platform $registry $tag
            ;;
        build)
            if [[ -z "$platform" ]]; then
                log_error "Platform required for build command"
                show_usage
                exit 1
            fi
            check_prerequisites build $platform
            build_images $platform $registry $tag
            ;;
        cleanup)
            cleanup
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
