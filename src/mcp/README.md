# MCP Server Configuration

## 🚀 Working Configuration

This directory contains the **working MCP server** for Claude Desktop integration.

### Files Structure
```
src/mcp/
├── config/
│   └── claude_desktop_config_simple.json  # Working Claude Desktop config
├── servers/
│   ├── mcp-server-simple.js              # ✅ Working JavaScript server
│   └── query-translator-basic.ts          # Query translation utilities
└── README.md                              # This file
```

## ✅ Current Setup

**Server**: `mcp-server-simple.js`
- Pure JavaScript (no TypeScript compilation issues)
- No interfering logs
- Stable MCP protocol communication
- Basic query translation for business data

**Configuration**: Applied to Claude Desktop automatically
- Location: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Command: `node` with direct JavaScript execution
- No external dependencies causing issues

## 🔧 Usage

The MCP server provides two tools:

### 1. `query` Tool
Processes natural language queries about business data:
- CRM data (contacts, communications, organizations)
- Financial data (deals, investments, funds)
- Business relationships and insights

**Examples:**
- "Show recent deals with Blackstone"
- "Find contacts in technology sector"
- "List communications from last week"

### 2. `help` Tool
Provides documentation about server capabilities.

## 🛠️ Troubleshooting

If Claude Desktop shows "server disconnected":
1. Restart Claude Desktop completely
2. Check the configuration is properly installed
3. The server runs silently (no logs to interfere with JSON protocol)

## 📝 Development Notes

- **Previous versions removed**: Multiple TypeScript servers were causing JSON protocol interference due to log output
- **Current approach**: Pure JavaScript with zero log output for maximum compatibility
- **Query translation**: Basic pattern matching without external AI dependencies 