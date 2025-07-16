#!/bin/bash

# Launch Chat with Procurement Database and Ontology
# This script starts all services needed for the procurement chat

set -e

echo "🚀 Launching Procurement Chat"
echo "=============================="

# Set environment variables for procurement
export NEO4J_DATABASE=procurement
export MCP_ACTIVE_ONTOLOGIES=procurement

echo "📋 Configuration:"
echo "   Database: procurement"
echo "   Ontology: procurement"
echo ""

# Check if Neo4j is running
echo "🔍 Checking Neo4j..."
if docker ps | grep -q neo4j; then
    echo "✅ Neo4j is running"
else
    echo "⚠️  Starting Neo4j..."
    docker-compose -f docker-compose.neo4j.yml up -d
    echo "   Waiting for Neo4j to be ready..."
    sleep 10
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
echo "🎉 Procurement Chat is ready!"
echo ""
echo "📱 Open your browser and go to: http://localhost:5173"
echo ""
echo "💡 Try these procurement-specific queries:"
echo "   - 'show all contracts'"
echo "   - 'list all buyers'"
echo "   - 'find tenders related to [company]'"
echo "   - 'show award decisions'"
echo "   - 'list all procedures'"
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