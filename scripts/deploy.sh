#!/bin/bash

# Unified Deployment Script for Dashboard Killer Graph
# This script handles deployment of various services (NLP, MCP, etc.)

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Default configuration
DEFAULT_SERVICE="nlp"
DEFAULT_PORT=8000
DEFAULT_IMAGE="dashboard-killer-graph"

# Parse command line arguments
SERVICE=${1:-$DEFAULT_SERVICE}
PORT=${2:-$DEFAULT_PORT}
IMAGE=${3:-$DEFAULT_IMAGE}

# Show help
if [ "$SERVICE" = "--help" ] || [ "$SERVICE" = "-h" ]; then
    print_header "Unified Deployment Script"
    echo ""
    echo "Usage: $0 [service] [port] [image]"
    echo ""
    echo "Services:"
    echo "  nlp       - NLP Service (Python/FastAPI)"
    echo "  mcp       - MCP Server (Node.js)"
    echo "  all       - Deploy all services"
    echo ""
    echo "Arguments:"
    echo "  service   - Service to deploy (default: $DEFAULT_SERVICE)"
    echo "  port      - Port to use (default: $DEFAULT_PORT)"
    echo "  image     - Docker image name (default: $DEFAULT_IMAGE)"
    echo ""
    echo "Examples:"
    echo "  $0 nlp                    # Deploy NLP service"
    echo "  $0 mcp 3002              # Deploy MCP server on port 3002"
    echo "  $0 all                   # Deploy all services"
    echo "  $0 --help                # Show this help"
    echo ""
    echo "Environment variables:"
    echo "  OPENAI_API_KEY     - OpenAI API key for LLM features"
    echo "  ENABLE_PROMPT_DEBUG - Enable prompt debugging (0/1)"
    echo "  LOG_LEVEL          - Log level (DEBUG/INFO/WARNING/ERROR)"
    echo ""
    exit 0
fi

# Validate service
case $SERVICE in
    "nlp"|"mcp"|"all")
        ;;
    *)
        print_error "Invalid service: $SERVICE"
        echo "Valid services: nlp, mcp, all"
        exit 1
        ;;
esac

# Display header
print_header "Deploying $SERVICE Service"
echo "📋 Service: $SERVICE"
echo "   Port: $PORT"
echo "   Image: $IMAGE"
echo ""

# Check prerequisites
print_section "🔍 Checking Prerequisites"
check_docker
check_port $PORT "$SERVICE Service"

# Function to deploy NLP service
deploy_nlp() {
    local port=$1
    local image=$2
    
    print_section "🐳 Building NLP Service Docker Image"
    
    # Navigate to the NLP service directory
    cd python-services/nlp-service
    
    # Build the image
    docker build -t "$image-nlp:latest" .
    
    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    # Return to original directory
    cd ../..
    
    print_section "🚀 Starting NLP Service Container"
    
    # Check if OPENAI_API_KEY is set
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY environment variable is not set"
        print_warning "LLM features will be disabled"
    fi
    
    # Run the container
    docker run -d \
        --name "nlp-service-container" \
        -p $port:8000 \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e ENABLE_PROMPT_DEBUG="${ENABLE_PROMPT_DEBUG:-0}" \
        -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
        --restart unless-stopped \
        "$image-nlp:latest"
    
    if [ $? -eq 0 ]; then
        print_success "NLP Service container started successfully"
    else
        print_error "Failed to start NLP Service container"
        exit 1
    fi
    
    # Wait for service to be ready
    wait_for_service "http://localhost:$port/health" "NLP Service"
    
    # Show service information
    print_success "NLP Service deployed successfully!"
    echo ""
    echo "Service Information:"
    echo "  - URL: http://localhost:$port"
    echo "  - Health Check: http://localhost:$port/health"
    echo "  - API Documentation: http://localhost:$port/docs"
    echo "  - Container Name: nlp-service-container"
    echo ""
    echo "Available endpoints:"
    echo "  - POST /extract-entities - Extract entities using spaCy"
    echo "  - POST /refine-entities - Extract and refine entities with LLM"
    echo "  - POST /extract-graph - Extract knowledge graph with LLM"
    echo "  - POST /batch-extract-graph - Batch process multiple texts"
    echo "  - POST /embed - Generate embeddings"
    echo "  - POST /ontologies - Update ontology schema"
    echo "  - GET /health - Health check"
    echo ""
    echo "To stop the service:"
    echo "  docker stop nlp-service-container"
    echo ""
    echo "To view logs:"
    echo "  docker logs nlp-service-container"
    echo ""
    echo "To restart the service:"
    echo "  docker restart nlp-service-container"
}

# Function to deploy MCP service
deploy_mcp() {
    local port=$1
    local image=$2
    
    print_section "🐳 Building MCP Service Docker Image"
    
    # Create a simple Dockerfile for MCP service
    cat > Dockerfile.mcp << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
COPY config/ ./config/
COPY ontologies/ ./ontologies/
EXPOSE $port
CMD ["node", "src/mcp/servers/mcp-server-http.js"]
EOF
    
    # Build the image
    docker build -f Dockerfile.mcp -t "$image-mcp:latest" .
    
    if [ $? -eq 0 ]; then
        print_success "MCP Docker image built successfully"
    else
        print_error "Failed to build MCP Docker image"
        exit 1
    fi
    
    # Clean up temporary Dockerfile
    rm Dockerfile.mcp
    
    print_section "🚀 Starting MCP Service Container"
    
    # Run the container
    docker run -d \
        --name "mcp-service-container" \
        -p $port:$port \
        -e NEO4J_DATABASE="${NEO4J_DATABASE:-dashboard-killer}" \
        -e MCP_ACTIVE_ONTOLOGIES="${MCP_ACTIVE_ONTOLOGIES:-core,fibo,procurement}" \
        -e MCP_HTTP_PORT="$port" \
        -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
        --restart unless-stopped \
        "$image-mcp:latest"
    
    if [ $? -eq 0 ]; then
        print_success "MCP Service container started successfully"
    else
        print_error "Failed to start MCP Service container"
        exit 1
    fi
    
    # Wait for service to be ready
    wait_for_service "http://localhost:$port/health" "MCP Service"
    
    # Show service information
    print_success "MCP Service deployed successfully!"
    echo ""
    echo "Service Information:"
    echo "  - URL: http://localhost:$port"
    echo "  - Health Check: http://localhost:$port/health"
    echo "  - Tools: http://localhost:$port/tools"
    echo "  - Container Name: mcp-service-container"
    echo ""
    echo "To stop the service:"
    echo "  docker stop mcp-service-container"
    echo ""
    echo "To view logs:"
    echo "  docker logs mcp-service-container"
    echo ""
    echo "To restart the service:"
    echo "  docker restart mcp-service-container"
}

# Function to deploy with docker-compose
deploy_compose() {
    print_section "🐳 Deploying with Docker Compose"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        
        if [ $? -eq 0 ]; then
            print_success "Services deployed with docker-compose"
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
    print_section "🚀 Deploying Production Version"
    
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml up -d
        
        if [ $? -eq 0 ]; then
            print_success "Production services deployed"
            return 0
        else
            print_error "Failed to deploy production services"
            return 1
        fi
    else
        print_error "docker-compose.production.yml not found"
        return 1
    fi
}

# Main deployment logic
case $SERVICE in
    "nlp")
        deploy_nlp $PORT $IMAGE
        ;;
    "mcp")
        deploy_mcp $PORT $IMAGE
        ;;
    "all")
        print_section "🚀 Deploying All Services"
        deploy_nlp 8000 $IMAGE
        echo ""
        deploy_mcp 3002 $IMAGE
        echo ""
        print_success "All services deployed successfully!"
        ;;
esac 