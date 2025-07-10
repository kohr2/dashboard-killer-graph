#!/bin/bash

# MCP Server Setup Script for Agents
# This script helps agents quickly configure the MCP server

set -e

echo "🔧 MCP Server Setup for Knowledge Graph Platform"
echo "================================================"

# Get project root
PROJECT_ROOT=$(pwd)
echo "📁 Project root: $PROJECT_ROOT"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi

echo "✅ npm found"

# Check if Neo4j is running
echo "🔍 Checking Neo4j connection..."
if ! curl -s http://localhost:7474 > /dev/null; then
    echo "⚠️  Neo4j not accessible at localhost:7474"
    echo "   Please start Neo4j with: docker-compose -f docker-compose.neo4j.yml up -d"
else
    echo "✅ Neo4j is running"
fi

# Create agent-specific config
echo "📝 Creating agent configuration..."

# Detect agent type
AGENT_CONFIG=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    AGENT_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    mkdir -p "$(dirname "$AGENT_CONFIG")"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    AGENT_CONFIG="$APPDATA/Claude/claude_desktop_config.json"
    mkdir -p "$(dirname "$AGENT_CONFIG")"
else
    # Linux
    AGENT_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
    mkdir -p "$(dirname "$AGENT_CONFIG")"
fi

# Create configuration
cat > "$AGENT_CONFIG" << EOF
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": [
        "$PROJECT_ROOT/src/mcp/servers/mcp-server-simple.js"
      ],
      "cwd": "$PROJECT_ROOT",
      "env": {
        "NEO4J_DATABASE": "dashboard-killer",
        "MCP_ACTIVE_ONTOLOGIES": "core,fibo,procurement,geonames"
      }
    }
  }
}
EOF

echo "✅ Configuration created at: $AGENT_CONFIG"

# Test MCP server
echo "🧪 Testing MCP server..."
if node "$PROJECT_ROOT/src/mcp/servers/mcp-server-simple.js" --test; then
    echo "✅ MCP server test passed"
else
    echo "⚠️  MCP server test failed - check logs above"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your agent (Claude Desktop, etc.)"
echo "2. The knowledge graph tool should now be available"
echo "3. Try queries like:"
echo "   - 'show all companies'"
echo "   - 'find cities in United States'"
echo "   - 'count contracts'"
echo ""
echo "🔧 Configuration options:"
echo "- Change database: Set NEO4J_DATABASE in the config"
echo "- Enable ontologies: Modify MCP_ACTIVE_ONTOLOGIES"
echo "- Available databases: dashboard-killer, fibo, procurement, geonames"
echo ""
echo "📚 For more information, see: src/mcp/README.md" 