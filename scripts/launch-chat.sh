#!/bin/bash

# Smart Chat Launcher
# Reads configuration from chat-config.json and launches the selected chat setup
# Uses actual ontology config.json files for metadata

set -e

CONFIG_FILE="scripts/chat-config.json"

# Function to read ontology config and display info
get_ontology_info() {
    local config_path=$1
    local config_name=$2
    
    if [ -f "$config_path" ]; then
        echo "📚 Ontology Information:"
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
        echo "⚠️  Warning: Ontology config not found at $config_path"
        echo ""
    fi
}

# Function to display available configurations
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

# Function to get configuration details
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

# Function to show example queries
show_examples() {
    local config_name=$1
    echo "Example queries for $config_name:"
    echo ""
    
    # Try to get examples from JSON
    local examples=$(jq -r ".chat_configurations.$config_name.example_queries[]" "$CONFIG_FILE" 2>/dev/null)
    
    if [ -z "$examples" ]; then
        # Fallback examples
        case $config_name in
            "procurement")
                echo "  - show all contracts"
                echo "  - list all buyers"
                echo "  - find tenders related to [company]"
                echo "  - show award decisions"
                ;;
            "fibo")
                echo "  - show all organizations"
                echo "  - list all deals"
                echo "  - find companies related to [company]"
                echo "  - show investments"
                ;;
            "geonames")
                echo "  - show all cities"
                echo "  - list all countries"
                echo "  - find locations in [country]"
                echo "  - show geographic features"
                ;;
            "isco")
                echo "  - show all occupations"
                echo "  - list all job categories"
                echo "  - find skills related to [occupation]"
                echo "  - show professional classifications"
                ;;
            "sp500")
                echo "  - show all companies"
                echo "  - list all stocks"
                echo "  - find companies in [sector]"
                echo "  - show market data"
                ;;
            *)
                echo "  - show all entities"
                echo "  - list all nodes"
                echo "  - find relationships"
                ;;
        esac
    else
        echo "$examples" | sed 's/^/  - /'
    fi
    echo ""
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [configuration_name]"
    echo ""
    echo "Launches the chat with the specified configuration."
    echo "Each configuration uses the actual ontology config.json files."
    echo ""
    show_configurations
    echo "Examples:"
    echo "  $0 procurement    # Launch procurement chat"
    echo "  $0 fibo          # Launch FIBO chat"
    echo "  $0 geonames      # Launch geonames chat"
    echo "  $0 isco          # Launch ISCO chat"
    echo "  $0 sp500         # Launch S&P 500 chat"
    echo "  $0               # Launch with default configuration"
    exit 0
fi

# Get configuration name
CONFIG_NAME=${1:-$(jq -r '.default_config' "$CONFIG_FILE" 2>/dev/null || echo "procurement")}

# Validate configuration
VALID_CONFIGS="procurement fibo geonames isco sp500 testont default"
if [[ ! " $VALID_CONFIGS " =~ " $CONFIG_NAME " ]]; then
    echo "❌ Invalid configuration: $CONFIG_NAME"
    echo ""
    show_configurations
    exit 1
fi

# Get database, ontology, and config path from configuration
CONFIG_DETAILS=$(get_config "$CONFIG_NAME")
DATABASE=$(echo "$CONFIG_DETAILS" | cut -d: -f1)
ONTOLOGY=$(echo "$CONFIG_DETAILS" | cut -d: -f2)
CONFIG_PATH=$(echo "$CONFIG_DETAILS" | cut -d: -f3)

echo "🚀 Launching Chat with Configuration: $CONFIG_NAME"
echo "=================================================="
echo "📋 Settings:"
echo "   Database: $DATABASE"
echo "   Ontology: $ONTOLOGY"
echo ""

# Show ontology information from actual config file
get_ontology_info "$CONFIG_PATH" "$CONFIG_NAME"

# Show example queries
show_examples "$CONFIG_NAME"

# Set environment variables
export NEO4J_DATABASE=$DATABASE
export MCP_ACTIVE_ONTOLOGIES=$ONTOLOGY

# Check if Neo4j is running
echo "🔍 Checking Neo4j..."
if docker ps | grep -q neo4j 2>/dev/null; then
    echo "✅ Neo4j is running (Docker)"
elif curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Neo4j is running (Desktop/Standalone)"
else
    echo "⚠️  Neo4j is not running"
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
    echo "After starting Neo4j, run this script again:"
    echo "   npm run chat:$CONFIG_NAME"
    echo ""
    read -p "Press Enter to continue anyway (services may fail to start)..."
fi

# Start services in parallel
echo ""
echo "🔄 Starting services..."

# Start NLP Service
echo "   Starting NLP Service..."
cd python-services/nlp-service
if [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn main:app --reload --port 8001 &
NLP_PID=$!
cd ../..

# Start Backend API
echo "   Starting Backend API..."
NODE_ENV=development npx ts-node src/api.ts &
BACKEND_PID=$!

# Start Chat UI
echo "   Starting Chat UI..."
cd chat-ui
npm run dev &
UI_PID=$!
cd ..

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
echo "🔍 Checking service status..."

if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ NLP Service: http://localhost:8001"
else
    echo "❌ NLP Service failed to start"
fi

if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API: http://localhost:3001"
else
    echo "❌ Backend API failed to start"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Chat UI: http://localhost:5173"
else
    echo "❌ Chat UI failed to start"
fi

echo ""
echo "🎉 $CONFIG_NAME Chat is ready!"
echo ""
echo "📱 Open your browser and go to: http://localhost:5173"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $NLP_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $UI_PID 2>/dev/null || true
    echo "✅ Services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait 