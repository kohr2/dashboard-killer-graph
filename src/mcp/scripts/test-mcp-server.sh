#!/bin/bash

# Script pour tester le serveur MCP simple
# Usage: ./test-mcp-server.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="$SCRIPT_DIR/../servers/mcp-server-simple.js"

echo "🧪 Testing MCP Server..."

# Vérifier que le serveur existe
if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ Server file not found: $SERVER_FILE"
    exit 1
fi

echo "📍 Server location: $SERVER_FILE"
echo "🔍 Testing server initialization..."

# Test d'initialisation
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node "$SERVER_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MCP Server test successful!"
    echo "🎉 Server is ready for Claude Desktop integration"
else
    echo ""
    echo "❌ MCP Server test failed"
    exit 1
fi
