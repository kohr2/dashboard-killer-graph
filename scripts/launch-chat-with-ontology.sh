#!/bin/bash

# Launch Chat with Specific Database and Ontology
# Usage: ./scripts/launch-chat-with-ontology.sh [database] [ontology]
# Example: ./scripts/launch-chat-with-ontology.sh procurement procurement

set -e

# Default values
DEFAULT_DATABASE="neo4j"
DEFAULT_ONTOLOGY="core"

# Parse command line arguments
DATABASE=${1:-$DEFAULT_DATABASE}
ONTOLOGY=${2:-$DEFAULT_ONTOLOGY}

echo "🚀 Launching Chat with Database: $DATABASE, Ontology: $ONTOLOGY"
echo "=================================================="

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $service_name is already running on port $port"
        return 0
    else
        echo "❌ $service_name is not running on port $port"
        return 1
    fi
}

# Function to start a service in background
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    
    echo "🔄 Starting $service_name..."
    if check_service $port $service_name; then
        echo "   $service_name is already running"
    else
        echo "   Running: $command"
        eval "$command" &
        local pid=$!
        echo "   $service_name started with PID: $pid"
        
        # Wait a bit for service to start
        sleep 3
        
        # Check if service started successfully
        if check_service $port $service_name; then
            echo "   ✅ $service_name started successfully"
        else
            echo "   ❌ Failed to start $service_name"
            exit 1
        fi
    fi
}

# Set environment variables
export NEO4J_DATABASE=$DATABASE
export MCP_ACTIVE_ONTOLOGIES=$ONTOLOGY

echo "📋 Environment Configuration:"
echo "   NEO4J_DATABASE=$NEO4J_DATABASE"
echo "   MCP_ACTIVE_ONTOLOGIES=$MCP_ACTIVE_ONTOLOGIES"
echo ""

# Check if Neo4j is running
echo "🔍 Checking Neo4j database..."
if docker ps | grep -q neo4j; then
    echo "✅ Neo4j container is running"
else
    echo "⚠️  Neo4j container not found. Starting Neo4j..."
    docker-compose -f docker-compose.neo4j.yml up -d
    echo "   Waiting for Neo4j to be ready..."
    sleep 10
fi

# Start NLP Service (Python)
echo ""
echo "🔍 Starting NLP Service..."
cd python-services/nlp-service
if [ -d "venv" ]; then
    source venv/bin/activate
fi
start_service "NLP Service" "uvicorn main:app --reload --port 8001" 8001
cd ../..

# Start Backend API (Node.js)
echo ""
echo "🔍 Starting Backend API..."
start_service "Backend API" "NODE_ENV=development npx ts-node src/api.ts" 3001

# Start Chat UI (React)
echo ""
echo "🔍 Starting Chat UI..."
cd chat-ui
start_service "Chat UI" "npm run dev" 5173
cd ..

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📱 Chat UI: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3001"
echo "🤖 NLP Service: http://localhost:8001"
echo "🗄️  Neo4j Database: $DATABASE"
echo "📚 Active Ontology: $ONTOLOGY"
echo ""
echo "💡 Example queries to test:"
echo "   - 'show all organizations'"
echo "   - 'list all contracts'"
echo "   - 'find deals related to [company]'"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo ""

# Wait for user to stop
wait 