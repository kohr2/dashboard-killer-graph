#!/bin/bash

# Script pour basculer entre les différents serveurs MCP
# Usage: ./switch-mcp-server.sh [fallback|robust|simple]

set -e

CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../config"

# Fonction d'aide
show_help() {
    echo "🔧 MCP Server Switcher"
    echo ""
    echo "Usage: $0 [server_type]"
    echo ""
    echo "Available servers:"
    echo "  fallback  - Stable server with pattern matching (recommended)"
    echo "  robust    - Advanced server with AI translation (may disconnect)"
    echo "  simple    - Basic server for testing"
    echo ""
    echo "Examples:"
    echo "  $0 fallback    # Switch to fallback server"
    echo "  $0 robust      # Switch to robust server"
    echo "  $0 simple      # Switch to simple server"
    echo ""
    echo "Current configuration:"
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        echo "  $(cat "$CLAUDE_CONFIG_FILE" | grep -o 'mcp-server-[^.]*' | head -1 || echo 'Unknown')"
    else
        echo "  No configuration found"
    fi
}

# Fonction pour sauvegarder la config actuelle
backup_config() {
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Configuration backed up"
    fi
}

# Fonction pour redémarrer Claude Desktop
restart_claude() {
    echo "🔄 Restarting Claude Desktop..."
    pkill -f "Claude.app" 2>/dev/null || true
    sleep 2
    open -a Claude 2>/dev/null || echo "⚠️  Please start Claude Desktop manually"
}

# Vérifier les arguments
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

SERVER_TYPE="$1"

# Vérifier le type de serveur
case "$SERVER_TYPE" in
    "fallback")
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config_fallback.json"
        echo "🟡 Switching to Fallback Server (Stable)"
        ;;
    "robust")
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config_robust.json"
        echo "🤖 Switching to Robust Server (Advanced)"
        echo "⚠️  Note: This server may disconnect due to external API calls"
        ;;
    "simple")
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config_simple.json"
        echo "🔧 Switching to Simple Server (Basic)"
        ;;
    *)
        echo "❌ Unknown server type: $SERVER_TYPE"
        echo ""
        show_help
        exit 1
        ;;
esac

# Vérifier que le fichier de config existe
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Créer le répertoire Claude si nécessaire
mkdir -p "$CLAUDE_CONFIG_DIR"

# Sauvegarder l'ancienne config
backup_config

# Copier la nouvelle config
cp "$CONFIG_FILE" "$CLAUDE_CONFIG_FILE"
echo "✅ Configuration updated"

# Redémarrer Claude Desktop
restart_claude

echo ""
echo "🎉 Successfully switched to $SERVER_TYPE server!"
echo ""
echo "You can now use the 'llm-orchestrator' tool in Claude Desktop."
echo "Try queries like:"
echo "  - 'Show recent deals with Blackstone'"
echo "  - 'Find contacts in technology sector'"
echo "  - 'List all communications'" 