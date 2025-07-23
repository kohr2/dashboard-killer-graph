#!/bin/bash

# Unified Launcher for Dashboard Killer Graph
# This script replaces all individual launcher scripts with a single, configurable solution

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Default configuration
DEFAULT_CONFIG="procurement"
DEFAULT_NLP_PORT=8001
DEFAULT_API_PORT=3001
DEFAULT_UI_PORT=5173
DEFAULT_MCP_PORT=3002

# Parse command line arguments
CONFIG_NAME=${1:-$DEFAULT_CONFIG}
NLP_PORT=${2:-$DEFAULT_NLP_PORT}
API_PORT=${3:-$DEFAULT_API_PORT}
UI_PORT=${4:-$DEFAULT_UI_PORT}
MCP_PORT=${5:-$DEFAULT_MCP_PORT}

# Show help
if [ "$CONFIG_NAME" = "--help" ] || [ "$CONFIG_NAME" = "-h" ]; then
    print_header "Unified Launcher for Dashboard Killer Graph"
    echo ""
    echo "Usage: $0 [config] [nlp_port] [api_port] [ui_port] [mcp_port]"
    echo ""
    echo "Arguments:"
    echo "  config     - Configuration name (default: $DEFAULT_CONFIG)"
    echo "  nlp_port   - NLP service port (default: $DEFAULT_NLP_PORT)"
    echo "  api_port   - Backend API port (default: $DEFAULT_API_PORT)"
    echo "  ui_port    - Chat UI port (default: $DEFAULT_UI_PORT)"
    echo "  mcp_port   - MCP server port (default: $DEFAULT_MCP_PORT)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Launch with default config"
    echo "  $0 procurement                       # Launch procurement chat"
    echo "  $0 fibo 8002 3002 5174 3003         # Launch with custom ports"
    echo "  $0 --help                            # Show this help"
    echo ""
    show_configurations
    exit 0
fi

# Validate configuration
validate_config "$CONFIG_NAME"

# Get configuration details
CONFIG_DETAILS=$(get_config "$CONFIG_NAME")
DATABASE=$(echo "$CONFIG_DETAILS" | cut -d: -f1)
ONTOLOGY=$(echo "$CONFIG_DETAILS" | cut -d: -f2)
CONFIG_PATH=$(echo "$CONFIG_DETAILS" | cut -d: -f3)

# Display header
print_header "Launching Dashboard Killer Graph"
echo "📋 Configuration: $CONFIG_NAME"
echo "   Database: $DATABASE"
echo "   Ontology: $ONTOLOGY"
echo "   NLP Port: $NLP_PORT"
echo "   API Port: $API_PORT"
echo "   UI Port: $UI_PORT"
echo "   MCP Port: $MCP_PORT"
echo ""

# Show ontology information
get_ontology_info "$CONFIG_PATH" "$CONFIG_NAME"

# Set environment variables
export NEO4J_DATABASE=$DATABASE
export MCP_ACTIVE_ONTOLOGIES=$ONTOLOGY

# Check prerequisites
print_section "🔍 Checking Prerequisites"
check_node
check_neo4j

# Check ports
print_section "🔍 Checking Ports"
check_port $NLP_PORT "NLP Service"
check_port $API_PORT "Backend API"
check_port $UI_PORT "Chat UI"
check_port $MCP_PORT "MCP Server"

# Start services
print_section "🚀 Starting Services"

# Start NLP Service
start_nlp_service $NLP_PORT
NLP_PID=$!

# Start Backend API
start_backend_api $API_PORT
API_PID=$!

# Start Chat UI
start_chat_ui $UI_PORT
UI_PID=$!

# Start MCP Server (HTTP mode)
start_mcp_server "http" $MCP_PORT
MCP_PID=$!

# Setup cleanup trap
setup_cleanup_trap $NLP_PID $API_PID $UI_PID $MCP_PID

# Wait for services to start
print_section "⏳ Waiting for Services"
sleep 5

# Check service status
show_service_status \
    "NLP Service|http://localhost:$NLP_PORT/health|$NLP_PORT" \
    "Backend API|http://localhost:$API_PORT/api/health|$API_PORT" \
    "Chat UI|http://localhost:$UI_PORT|$UI_PORT" \
    "MCP Server|http://localhost:$MCP_PORT/health|$MCP_PORT"

# Show success message
print_success "$CONFIG_NAME Dashboard Killer Graph is ready!"
echo ""
echo "📱 Chat UI: http://localhost:$UI_PORT"
echo "🔧 Backend API: http://localhost:$API_PORT"
echo "🤖 NLP Service: http://localhost:$NLP_PORT"
echo "📡 MCP Server: http://localhost:$MCP_PORT"
echo "🗄️  Database: $DATABASE"
echo "📚 Ontology: $ONTOLOGY"
echo ""
echo "💡 Example queries:"
case $CONFIG_NAME in
    "procurement")
        echo "   - 'show all contracts'"
        echo "   - 'list all buyers'"
        echo "   - 'find tenders related to [company]'"
        ;;
    "fibo")
        echo "   - 'show all organizations'"
        echo "   - 'list all deals'"
        echo "   - 'find companies related to [company]'"
        ;;
    "geonames")
        echo "   - 'show all cities'"
        echo "   - 'list all countries'"
        echo "   - 'find locations in [country]'"
        ;;
    "isco")
        echo "   - 'show all occupations'"
        echo "   - 'list all job categories'"
        echo "   - 'find skills related to [occupation]'"
        ;;
    "sp500")
        echo "   - 'show all companies'"
        echo "   - 'list all stocks'"
        echo "   - 'find companies in [sector]'"
        ;;
    *)
        echo "   - 'show all entities'"
        echo "   - 'list all nodes'"
        echo "   - 'find relationships'"
        ;;
esac
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait 