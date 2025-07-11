#!/bin/bash

# External Agent Server Startup Script
# This script starts the MCP HTTP server for external agent integration

set -e

echo "🚀 Starting External Agent Server"
echo "=================================="

# Get the project root directory
PROJECT_ROOT=$(pwd)
echo "📁 Project: $PROJECT_ROOT"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 18+"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

# Check if Neo4j is running
if ! curl -s http://localhost:7474 > /dev/null; then
    echo "⚠️  Neo4j not accessible. Starting Neo4j..."
    docker-compose -f docker-compose.neo4j.yml up -d
    echo "⏳ Waiting for Neo4j to start..."
    sleep 10
fi

# Check Neo4j again
if curl -s http://localhost:7474 > /dev/null; then
    echo "✅ Neo4j running"
else
    echo "❌ Neo4j failed to start. Please check docker-compose.neo4j.yml"
    exit 1
fi

# Default configuration
DEFAULT_DATABASE="dashboard-killer"
DEFAULT_ONTOLOGIES="core,fibo,procurement,geonames"
DEFAULT_PORT="3002"

# Allow override via environment variables
NEO4J_DATABASE=${NEO4J_DATABASE:-$DEFAULT_DATABASE}
MCP_ACTIVE_ONTOLOGIES=${MCP_ACTIVE_ONTOLOGIES:-$DEFAULT_ONTOLOGIES}
MCP_HTTP_PORT=${MCP_HTTP_PORT:-$DEFAULT_PORT}

echo "🔧 Configuration:"
echo "   Database: $NEO4J_DATABASE"
echo "   Ontologies: $MCP_ACTIVE_ONTOLOGIES"
echo "   Port: $MCP_HTTP_PORT"

# Check if port is available
if lsof -Pi :$MCP_HTTP_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port $MCP_HTTP_PORT is already in use"
    echo "   You can either:"
    echo "   1. Stop the existing process on port $MCP_HTTP_PORT"
    echo "   2. Set MCP_HTTP_PORT to a different port"
    echo "   3. Use the --force flag to continue anyway"
    
    if [[ "$1" != "--force" ]]; then
        echo "   Usage: $0 [--force]"
        exit 1
    else
        echo "   Continuing with --force flag..."
    fi
fi

# Test server startup
echo "🧪 Testing server startup..."
if node "$PROJECT_ROOT/src/mcp/servers/mcp-server-http.js" --test 2>/dev/null; then
    echo "✅ Server test passed"
else
    echo "⚠️  Server test failed, but continuing..."
fi

# Start the server
echo ""
echo "🚀 Starting MCP HTTP Server..."
echo "   URL: http://localhost:$MCP_HTTP_PORT"
echo "   Health: http://localhost:$MCP_HTTP_PORT/health"
echo "   Tools: http://localhost:$MCP_HTTP_PORT/tools"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Export environment variables and start server
export NEO4J_DATABASE
export MCP_ACTIVE_ONTOLOGIES
export MCP_HTTP_PORT

# Start the server
node "$PROJECT_ROOT/src/mcp/servers/mcp-server-http.js" 