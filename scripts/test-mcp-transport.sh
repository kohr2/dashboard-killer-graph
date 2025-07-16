#!/bin/bash

# Test MCP Transport Options
# This script tests different MCP transport methods

set -e

echo "🧪 Testing MCP Transport Options"
echo "================================="

# Function to test stdio transport
test_stdio() {
    echo "📡 Testing STDIO transport..."
    echo "   This will start the MCP server in stdio mode"
    echo "   Press Ctrl+C to stop the test"
    echo ""
    
    NEO4J_DATABASE=dashboard-killer \
    MCP_ACTIVE_ONTOLOGIES=core,fibo \
    node src/mcp/servers/mcp-server-stdio.js
}

# Function to test HTTP transport
test_http() {
    echo "🌐 Testing HTTP transport..."
    echo "   Starting HTTP server on port 3002..."
    echo ""
    
    NEO4J_DATABASE=dashboard-killer \
    MCP_ACTIVE_ONTOLOGIES=core,fibo \
    MCP_HTTP_PORT=3002 \
    node src/mcp/servers/mcp-server-http.js &
    
    local pid=$!
    echo "   Server started with PID: $pid"
    
    # Wait for server to start
    sleep 3
    
    # Test health endpoint
    echo "   Testing health endpoint..."
    if curl -s http://localhost:3002/health > /dev/null; then
        echo "   ✅ HTTP server is running"
        echo "   📍 Health endpoint: http://localhost:3002/health"
        echo "   📍 Root endpoint: http://localhost:3002/"
    else
        echo "   ❌ HTTP server failed to start"
    fi
    
    echo ""
    echo "   Press Ctrl+C to stop the server"
    
    # Wait for user to stop
    wait $pid
}

# Main menu
echo "Choose transport to test:"
echo "1) STDIO (for Claude Desktop)"
echo "2) HTTP (for web clients)"
echo "3) Both (run HTTP in background, test endpoints)"
echo "4) Exit"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        test_stdio
        ;;
    2)
        test_http
        ;;
    3)
        echo "🚀 Starting both transports..."
        echo ""
        
        # Start HTTP server in background
        NEO4J_DATABASE=dashboard-killer \
        MCP_ACTIVE_ONTOLOGIES=core,fibo \
        MCP_HTTP_PORT=3002 \
        node src/mcp/servers/mcp-server-http.js &
        
        http_pid=$!
        echo "   HTTP server started with PID: $http_pid"
        
        # Wait for HTTP server to start
        sleep 3
        
        # Test HTTP endpoints
        echo "   Testing HTTP endpoints..."
        if curl -s http://localhost:3002/health > /dev/null; then
            echo "   ✅ HTTP server is running"
            echo "   📍 Health: http://localhost:3002/health"
            echo "   📍 Root: http://localhost:3002/"
        else
            echo "   ❌ HTTP server failed to start"
        fi
        
        echo ""
        echo "   Now starting STDIO server..."
        echo "   Press Ctrl+C to stop both servers"
        
        # Start STDIO server
        NEO4J_DATABASE=dashboard-killer \
        MCP_ACTIVE_ONTOLOGIES=core,fibo \
        node src/mcp/servers/mcp-server-stdio.js &
        
        stdio_pid=$!
        echo "   STDIO server started with PID: $stdio_pid"
        
        # Wait for user to stop
        wait
        
        # Cleanup
        kill $http_pid 2>/dev/null || true
        kill $stdio_pid 2>/dev/null || true
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac 