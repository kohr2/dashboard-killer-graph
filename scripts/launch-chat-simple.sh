#!/bin/bash

# Simple Chat Launcher (No Docker Required)
# Works with Neo4j Desktop or standalone Neo4j

set -e

CONFIG_FILE="scripts/chat-config.json"

# Function to get configuration details
get_config() {
    local config_name=$1
    local database=$(jq -r ".chat_configurations.$config_name.database" "$CONFIG_FILE" 2>/dev/null)
    local ontology=$(jq -r ".chat_configurations.$config_name.ontology" "$CONFIG_FILE" 2>/dev/null)
    local config_path=$(jq -r ".chat_configurations.$config_name.config_path" "$CONFIG_FILE" 2>/dev/null)
    
    # Fallback values
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

# Parse command line arguments
CONFIG_NAME=${1:-$(jq -r '.default_config' "$CONFIG_FILE" 2>/dev/null || echo "procurement")}

# Get configuration details
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

# Show ontology information
if [ -f "$CONFIG_PATH" ]; then
    echo "📚 Ontology Information:"
    echo "   Config: $CONFIG_PATH"
    
    local name=$(jq -r '.name // .description // "Unknown"' "$CONFIG_PATH" 2>/dev/null)
    local description=$(jq -r '.source.description // .description // "No description available"' "$CONFIG_PATH" 2>/dev/null)
    local version=$(jq -r '.source.version // .version // "Unknown"' "$CONFIG_PATH" 2>/dev/null)
    
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
    echo "⚠️  Warning: Ontology config not found at $CONFIG_PATH"
    echo ""
fi

# Check Neo4j connection
echo "🔍 Checking Neo4j connection..."
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Neo4j is running on http://localhost:7474"
else
    echo "❌ Neo4j is not running on http://localhost:7474"
    echo ""
    echo "📋 Please start Neo4j:"
    echo "   - Neo4j Desktop: Open Neo4j Desktop and start a database"
    echo "   - Standalone: Run 'neo4j start'"
    echo "   - Docker: Run 'docker-compose -f docker-compose.neo4j.yml up -d'"
    echo ""
    echo "After starting Neo4j, run this script again:"
    echo "   npm run chat:$CONFIG_NAME"
    exit 1
fi

# Set environment variables
export NEO4J_DATABASE=$DATABASE
export MCP_ACTIVE_ONTOLOGIES=$ONTOLOGY

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