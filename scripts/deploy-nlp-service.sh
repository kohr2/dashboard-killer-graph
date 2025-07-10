#!/bin/bash

# NLP Service Deployment Script
# This script deploys the NLP service for external access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="nlp-service"
DOCKER_IMAGE="nlp-service:latest"
CONTAINER_NAME="nlp-service-container"
EXTERNAL_PORT=8000
INTERNAL_PORT=8000

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if port is available
check_port() {
    if lsof -Pi :$EXTERNAL_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $EXTERNAL_PORT is already in use"
        read -p "Do you want to stop the existing service? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop $CONTAINER_NAME 2>/dev/null || true
            docker rm $CONTAINER_NAME 2>/dev/null || true
            print_success "Stopped existing container"
        else
            print_error "Port $EXTERNAL_PORT is required. Please free it up and try again."
            exit 1
        fi
    fi
}

# Function to build the Docker image
build_image() {
    print_status "Building Docker image..."
    
    # Navigate to the NLP service directory
    cd python-services/nlp-service
    
    # Build the image
    docker build -t $DOCKER_IMAGE .
    
    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    # Return to original directory
    cd ../..
}

# Function to run the container
run_container() {
    print_status "Starting NLP service container..."
    
    # Check if OPENAI_API_KEY is set
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY environment variable is not set"
        print_warning "LLM features will be disabled"
    fi
    
    # Run the container
    docker run -d \
        --name $CONTAINER_NAME \
        -p $EXTERNAL_PORT:$INTERNAL_PORT \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e ENABLE_PROMPT_DEBUG="${ENABLE_PROMPT_DEBUG:-0}" \
        -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
        --restart unless-stopped \
        $DOCKER_IMAGE
    
    if [ $? -eq 0 ]; then
        print_success "Container started successfully"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    print_status "Waiting for service to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$EXTERNAL_PORT/health > /dev/null 2>&1; then
            print_success "Service is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Service failed to start within expected time"
    return 1
}

# Function to display service information
show_service_info() {
    print_success "NLP Service deployed successfully!"
    echo
    echo "Service Information:"
    echo "  - URL: http://localhost:$EXTERNAL_PORT"
    echo "  - Health Check: http://localhost:$EXTERNAL_PORT/health"
    echo "  - API Documentation: http://localhost:$EXTERNAL_PORT/docs"
    echo "  - Container Name: $CONTAINER_NAME"
    echo
    echo "Available endpoints:"
    echo "  - POST /extract-entities - Extract entities using spaCy"
    echo "  - POST /refine-entities - Extract and refine entities with LLM"
    echo "  - POST /extract-graph - Extract knowledge graph with LLM"
    echo "  - POST /batch-extract-graph - Batch process multiple texts"
    echo "  - POST /embed - Generate embeddings"
    echo "  - POST /ontologies - Update ontology schema"
    echo "  - GET /health - Health check"
    echo
    echo "To stop the service:"
    echo "  docker stop $CONTAINER_NAME"
    echo
    echo "To view logs:"
    echo "  docker logs $CONTAINER_NAME"
    echo
    echo "To restart the service:"
    echo "  docker restart $CONTAINER_NAME"
}

# Function to deploy with docker-compose
deploy_with_compose() {
    print_status "Deploying with docker-compose..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d nlp-service
        
        if [ $? -eq 0 ]; then
            print_success "Service deployed with docker-compose"
            return 0
        else
            print_error "Failed to deploy with docker-compose"
            return 1
        fi
    else
        print_error "docker-compose.yml not found"
        return 1
    fi
}

# Function to deploy production version
deploy_production() {
    print_status "Deploying production version..."
    
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml up -d
        
        if [ $? -eq 0 ]; then
            print_success "Production service deployed"
            return 0
        else
            print_error "Failed to deploy production service"
            return 1
        fi
    else
        print_error "docker-compose.production.yml not found"
        return 1
    fi
}

# Main deployment function
main() {
    echo "NLP Service Deployment Script"
    echo "============================"
    echo
    
    # Check prerequisites
    check_docker
    check_port
    
    # Parse command line arguments
    case "${1:-}" in
        "compose")
            deploy_with_compose
            ;;
        "production")
            deploy_production
            ;;
        "build")
            build_image
            ;;
        "run")
            build_image
            run_container
            wait_for_service
            show_service_info
            ;;
        *)
            # Default: build and run
            build_image
            run_container
            wait_for_service
            show_service_info
            ;;
    esac
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  build      - Build Docker image only"
        echo "  run        - Build and run container"
        echo "  compose    - Deploy using docker-compose"
        echo "  production - Deploy production version with Nginx"
        echo "  help       - Show this help message"
        echo
        echo "Environment variables:"
        echo "  OPENAI_API_KEY     - OpenAI API key for LLM features"
        echo "  ENABLE_PROMPT_DEBUG - Enable prompt debugging (0/1)"
        echo "  LOG_LEVEL          - Log level (DEBUG/INFO/WARNING/ERROR)"
        echo
        echo "Examples:"
        echo "  $0                    # Build and run (default)"
        echo "  $0 compose            # Deploy with docker-compose"
        echo "  $0 production         # Deploy production version"
        echo "  OPENAI_API_KEY=sk-... $0  # Deploy with API key"
        exit 0
        ;;
esac

# Run main function
main "$@" 