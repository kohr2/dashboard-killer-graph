#!/bin/bash

# MCP Server Setup Script for Agents

set -e

echo "🔧 MCP Server Setup"
echo "=================="

PROJECT_ROOT=$(pwd)
echo "📁 Project: $PROJECT_ROOT"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 18+"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

if ! curl -s http://localhost:7474 > /dev/null; then
    echo "⚠️  Neo4j not accessible. Start with: docker-compose -f docker-compose.neo4j.yml up -d"
else
    echo "✅ Neo4j running"
fi

# Create agent config
echo "📝 Creating agent configuration..."

AGENT_CONFIG=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    AGENT_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    AGENT_CONFIG="$APPDATA/Claude/claude_desktop_config.json"
else
    AGENT_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
fi

mkdir -p "$(dirname "$AGENT_CONFIG")"

cat > "$AGENT_CONFIG" << EOF
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": [
        "$PROJECT_ROOT/src/mcp/servers/mcp-server-stdio.js"
      ],
      "cwd": "$PROJECT_ROOT",
      "env": {
        "NEO4J_DATABASE": "procurement",
        "MCP_ACTIVE_ONTOLOGIES": "core,procurement"
      }
    }
  }
}
EOF

echo "✅ Config: $AGENT_CONFIG"

# Test server
echo "🧪 Testing MCP server..."
if node "$PROJECT_ROOT/src/mcp/servers/mcp-server-stdio.js" --test; then
    echo "✅ Server test passed"
else
    echo "⚠️  Server test failed"
fi

echo ""
echo "🎉 Setup complete!"
echo "📋 Next: Restart your agent"
echo "🔧 Try: 'show all persons', 'show all contracts'"
echo "🔄 Dynamic database switching enabled!"
echo "💡 Use database parameter to switch between databases" 