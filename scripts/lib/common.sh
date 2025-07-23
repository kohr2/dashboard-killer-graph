#!/bin/bash

# Common Library for Dashboard Killer Graph Scripts
# This file contains shared functions and utilities used across all scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="scripts/chat-config.json"
PROJECT_ROOT=$(pwd)

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

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

print_header() {
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..${#1}})${NC}"
}

print_section() {
    echo -e "${MAGENTA}$1${NC}"
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Install Node.js 18+"
        exit 1
    fi
    print_success "Node.js: $(node --version)"
}

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

check_port() {
    local port=$1
    local service_name=${2:-"Service"}
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $port is already in use"
        read -p "Do you want to stop the existing service? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Try to find and stop the process using the port
            local pid=$(lsof -ti:$port)
            if [ ! -z "$pid" ]; then
                kill $pid 2>/dev/null || true
                print_success "Stopped existing process on port $port"
            fi
        else
            print_error "Port $port is required. Please free it up and try again."
            exit 1
        fi
    fi
}

check_neo4j() {
    print_status "Checking Neo4j..."
    
    if docker ps | grep -q neo4j 2>/dev/null; then
        print_success "Neo4j is running (Docker)"
        return 0
    elif curl -s http://localhost:7474 > /dev/null 2>&1; then
        print_success "Neo4j is running (Desktop/Standalone)"
        return 0
    else
        print_warning "Neo4j is not running"
        echo ""
        echo "📋 To start Neo4j, choose one of these options:"
        echo ""
        echo "Option 1: Start Docker Desktop"
        echo "   open -a Docker"
        echo "   # Wait for Docker to start, then run this script again"
        echo ""
        echo "Option 2: Start Neo4j Desktop"
        echo "   # Open Neo4j Desktop and start a database"
        echo "   # Make sure it's running on http://localhost:7474"
        echo ""
        echo "Option 3: Start Neo4j manually"
        echo "   # If you have Neo4j installed locally"
        echo "   neo4j start"
        echo ""
        read -p "Press Enter to continue anyway (services may fail to start)..."
        return 1
    fi
}

# =============================================================================
# SERVICE MANAGEMENT
# =============================================================================

check_service() {
    local port=$1
    local service_name=$2
    local endpoint=${3:-"/health"}
    
    if curl -s "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        print_success "$service_name is already running on port $port"
        return 0
    else
        print_warning "$service_name is not running on port $port"
        return 1
    fi
}

start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    local endpoint=${4:-"/health"}
    local wait_time=${5:-3}
    
    print_status "Starting $service_name..."
    if check_service $port "$service_name" $endpoint; then
        print_status "$service_name is already running"
        return 0
    else
        print_status "Running: $command"
        eval "$command" &
        local pid=$!
        print_status "$service_name started with PID: $pid"
        
        # Wait for service to start
        sleep $wait_time
        
        # Check if service started successfully
        if check_service $port "$service_name" $endpoint; then
            print_success "$service_name started successfully"
            return 0
        else
            print_error "Failed to start $service_name"
            return 1
        fi
    fi
}

wait_for_service() {
    local url=$1
    local service_name=${2:-"Service"}
    local max_attempts=${3:-30}
    local interval=${4:-2}
    
    print_status "Waiting for $service_name to be ready..."
    
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep $interval
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# =============================================================================
# CONFIGURATION MANAGEMENT
# =============================================================================

get_config() {
    local config_name=$1
    local database=$(jq -r ".chat_configurations.$config_name.database" "$CONFIG_FILE" 2>/dev/null)
    local ontology=$(jq -r ".chat_configurations.$config_name.ontology" "$CONFIG_FILE" 2>/dev/null)
    local config_path=$(jq -r ".chat_configurations.$config_name.config_path" "$CONFIG_FILE" 2>/dev/null)
    
    # Fallback values if JSON parsing fails
    if [ "$database" = "null" ] || [ -z "$database" ]; then
        case $config_name in
            "procurement") database="procurement"; ontology="procurement"; config_path="ontologies/procurement/config.json" ;;
            "fibo") database="fibo"; ontology="fibo"; config_path="ontologies/fibo/config.json" ;;
            "geonames") database="geonames"; ontology="geonames"; config_path="ontologies/geonames/config.json" ;;
            "isco") database="isco"; ontology="isco"; config_path="ontologies/isco/config.json" ;;
            "sp500") database="sp500"; ontology="sp500"; config_path="ontologies/sp500/config.json" ;;
            "testont") database="testont"; ontology="testont"; config_path="ontologies/testont/config.json" ;;
            *) database="neo4j"; ontology="core"; config_path="config/ontology/core.ontology.json" ;;
        esac
    fi
    
    echo "$database:$ontology:$config_path"
}

get_ontology_info() {
    local config_path=$1
    local config_name=$2
    
    if [ -f "$config_path" ]; then
        print_section "📚 Ontology Information:"
        echo "   Config: $config_path"
        
        # Read basic info from config
        local name=$(jq -r '.name // .description // "Unknown"' "$config_path" 2>/dev/null)
        local description=$(jq -r '.source.description // .description // "No description available"' "$config_path" 2>/dev/null)
        local version=$(jq -r '.source.version // .version // "Unknown"' "$config_path" 2>/dev/null)
        
        echo "   Name: $name"
        echo "   Description: $description"
        echo "   Version: $version"
        
        # Check if ontology.json exists
        local ontology_json="${config_path%config.json}ontology.json"
        if [ -f "$ontology_json" ]; then
            local entity_count=$(jq -r '.entityCount // "Unknown"' "$ontology_json" 2>/dev/null)
            local relationship_count=$(jq -r '.relationshipCount // "Unknown"' "$ontology_json" 2>/dev/null)
            echo "   Entities: $entity_count"
            echo "   Relationships: $relationship_count"
        fi
        
        echo ""
    else
        print_warning "Ontology config not found at $config_path"
        echo ""
    fi
}

show_configurations() {
    echo "Available chat configurations:"
    echo ""
    
    # Parse JSON and display configurations with ontology info
    jq -r '.chat_configurations | to_entries[] | "  \(.key): \(.value.description)"' "$CONFIG_FILE" 2>/dev/null || {
        echo "  procurement: Uses procurement ontology configuration"
        echo "  fibo: Uses FIBO ontology configuration" 
        echo "  geonames: Uses GeoNames ontology configuration"
        echo "  isco: Uses ISCO ontology configuration"
        echo "  sp500: Uses S&P 500 ontology configuration"
        echo "  testont: Uses test ontology configuration"
        echo "  default: Uses core system ontology"
    }
    echo ""
}

# =============================================================================
# SERVICE STARTUP FUNCTIONS
# =============================================================================

start_nlp_service() {
    local port=${1:-8001}
    local venv_path="python-services/nlp-service/venv"
    
    print_status "Starting NLP Service on port $port..."
    
    cd python-services/nlp-service
    
    # Activate virtual environment if it exists
    if [ -d "$venv_path" ]; then
        source "$venv_path/bin/activate"
    fi
    
    # Start the service
    uvicorn main:app --reload --port $port &
    local pid=$!
    
    cd ../..
    
    print_status "NLP Service started with PID: $pid"
    return $pid
}

start_backend_api() {
    local port=${1:-3001}
    
    print_status "Starting Backend API on port $port..."
    
    NODE_ENV=development npx ts-node src/api.ts &
    local pid=$!
    
    print_status "Backend API started with PID: $pid"
    return $pid
}

start_chat_ui() {
    local port=${1:-5173}
    
    print_status "Starting Chat UI on port $port..."
    
    cd chat-ui
    npm run dev &
    local pid=$!
    cd ..
    
    print_status "Chat UI started with PID: $pid"
    return $pid
}

start_mcp_server() {
    local transport=${1:-"stdio"}
    local port=${2:-3002}
    
    print_status "Starting MCP Server ($transport) on port $port..."
    
    case $transport in
        "stdio")
            node src/mcp/servers/mcp-server-stdio.js &
            ;;
        "http")
            MCP_HTTP_PORT=$port node src/mcp/servers/mcp-server-http.js &
            ;;
        *)
            print_error "Unknown transport: $transport"
            return 1
            ;;
    esac
    
    local pid=$!
    print_status "MCP Server started with PID: $pid"
    return $pid
}

# =============================================================================
# CLEANUP FUNCTIONS
# =============================================================================

cleanup_services() {
    local pids=("$@")
    
    print_status "Stopping services..."
    for pid in "${pids[@]}"; do
        if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null || true
            print_status "Stopped process $pid"
        fi
    done
    print_success "Services stopped"
}

setup_cleanup_trap() {
    local pids=("$@")
    
    # Function to cleanup on exit
    cleanup() {
        echo ""
        cleanup_services "${pids[@]}"
        exit 0
    }
    
    # Set trap to cleanup on exit
    trap cleanup SIGINT SIGTERM
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

validate_config() {
    local config_name=$1
    local valid_configs=${2:-"procurement fibo geonames isco sp500 testont default"}
    
    if [[ ! " $valid_configs " =~ " $config_name " ]]; then
        print_error "Invalid configuration: $config_name"
        echo ""
        show_configurations
        exit 1
    fi
}

validate_ontology() {
    local ontology_name=$1
    local ontology_dir="ontologies/$ontology_name"
    
    if [ ! -d "$ontology_dir" ]; then
        print_error "Ontology directory not found: $ontology_dir"
        exit 1
    fi
    
    if [ ! -f "$ontology_dir/config.json" ]; then
        print_error "Ontology config not found: $ontology_dir/config.json"
        exit 1
    fi
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

get_arg_value() {
    local args=("$@")
    local arg_name=$1
    shift
    
    for i in "${!args[@]}"; do
        if [ "${args[$i]}" = "$arg_name" ] && [ $((i+1)) -lt ${#args[@]} ]; then
            echo "${args[$((i+1))]}"
            return 0
        fi
    done
    echo ""
}

show_help() {
    local script_name=$1
    local description=$2
    local usage=$3
    local examples=$4
    
    echo "Usage: $script_name $usage"
    echo ""
    echo "$description"
    echo ""
    
    if [ ! -z "$examples" ]; then
        echo "Examples:"
        echo "$examples"
        echo ""
    fi
    
    exit 0
}

show_service_status() {
    local services=("$@")
    
    print_section "🔍 Checking service status..."
    
    for service in "${services[@]}"; do
        IFS='|' read -r name url port <<< "$service"
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name: $url"
        else
            print_error "$name failed to start"
        fi
    done
    
    echo ""
} 