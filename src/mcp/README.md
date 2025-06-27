# MCP (Model Context Protocol) Servers

This directory contains the MCP server implementations for the dashboard-killer-graph project, providing natural language query translation capabilities for business data.

## 📁 Architecture

```
src/mcp/
├── servers/           # MCP server implementations
├── config/           # Configuration templates
├── monitoring/       # Debug and monitoring tools
├── scripts/         # Startup and utility scripts
└── README.md        # This documentation
```

## 🚀 Available Servers

### 1. **Fallback Server** (Recommended - Stable)
**File:** `servers/mcp-server-fallback.ts`
- ✅ **Stable and reliable** - No external dependencies
- ✅ **Pattern matching** query translation
- ✅ **Always stays connected** to Claude Desktop
- ✅ **Basic but effective** entity detection
- 🎯 **Best for production use**

### 2. **Robust Server** (Advanced - May disconnect)
**File:** `servers/mcp-server-robust.ts`
- 🤖 **AI-powered** query translation using OpenAI
- 📊 **Advanced ontology** integration
- 🔄 **Fallback mechanism** when AI fails
- ⚠️ **May disconnect** due to external API calls
- 🎯 **Best for development/testing**

### 3. **Simple Server** (Basic)
**File:** `servers/mcp-server-simple.ts`
- 🔧 **Minimal implementation** for testing
- 📝 **Basic documentation** responses only
- 🎯 **Best for connection testing**

### 4. **STDIO Server** (Experimental)
**File:** `servers/mcp-server-stdio.ts`
- 🧪 **Experimental implementation**
- 🔌 **Direct stdio communication**
- 🎯 **Best for protocol debugging**

### 5. **Original Server** (Legacy)
**File:** `servers/mcp-server-original.ts`
- 📜 **Original implementation**
- 🎯 **Kept for reference**

## 🔧 Configuration

### Current Active Configuration
The system is currently configured to use the **Fallback Server** for maximum stability.

**Claude Desktop Config Location:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Active Configuration:**
```json
{
  "mcpServers": {
    "llm-orchestrator": {
      "command": "npx",
      "args": ["ts-node", "/path/to/src/mcp/servers/mcp-server-fallback.ts"],
      "cwd": "/path/to/dashboard-killer-graph"
    }
  }
}
```

### Alternative Configurations
- **Robust Server Config:** `config/claude_desktop_config_robust.json`
- **Fallback Server Config:** `config/claude_desktop_config_fallback.json`

## 🛠️ Usage

### Starting a Server Manually
```bash
# Fallback server (recommended)
npx ts-node src/mcp/servers/mcp-server-fallback.ts

# Robust server (requires OPENAI_API_KEY)
OPENAI_API_KEY=your_key npx ts-node -r tsconfig-paths/register src/mcp/servers/mcp-server-robust.ts
```

### Using with Claude Desktop
1. Copy the appropriate config to Claude Desktop config location
2. Restart Claude Desktop
3. Use the `llm-orchestrator` tool in conversations

### Example Queries
```
- "Show recent deals with Blackstone"
- "Find contacts in technology sector"  
- "List all communications"
- "Get organizations in Paris"
```

## 🔍 Monitoring & Debugging

### Debug Tools
- **`monitoring/debug-mcp.js`** - Test server responses
- **`monitoring/monitor-mcp.js`** - Monitor server health and connections

### Usage
```bash
# Test server functionality
node src/mcp/monitoring/debug-mcp.js

# Monitor server in real-time
node src/mcp/monitoring/monitor-mcp.js src/mcp/servers/mcp-server-fallback.ts
```

## 🔄 Query Translation

All servers translate natural language queries into structured JSON format:

### Input
```
"Show recent deals with Blackstone"
```

### Output
```json
{
  "command": "show_related",
  "resourceTypes": ["Deal"],
  "relatedTo": ["Organization"],
  "filters": {
    "name": "Blackstone"
  }
}
```

## 📊 Supported Entity Types

- **Party, Person, Organization** - People and companies
- **Contact, Communication** - CRM data
- **Deal, Investor, Fund** - Financial data
- **Sector, GeographicRegion** - Classifications
- **Document, Process** - Business processes

## 🚨 Troubleshooting

### Server Disconnects
- **Solution:** Use the fallback server (`mcp-server-fallback.ts`)
- **Reason:** Robust server may disconnect due to external API calls

### No Tools Available
- **Check:** Claude Desktop configuration file location
- **Verify:** Server file paths are absolute
- **Restart:** Claude Desktop after config changes

### Query Translation Issues
- **Fallback:** Uses pattern matching (basic but reliable)
- **Robust:** Uses OpenAI API (advanced but requires stable connection)

## 🔧 Development

### Adding New Features
1. Modify the appropriate server file
2. Test with debug tools
3. Update configuration if needed
4. Restart Claude Desktop

### Testing Changes
```bash
# Quick test
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "query", "arguments": {"query": "test"}}, "id": "1"}' | npx ts-node src/mcp/servers/mcp-server-fallback.ts
```

## 📝 Notes

- **Production:** Use fallback server for stability
- **Development:** Use robust server for advanced features
- **Always:** Use absolute paths in Claude Desktop config
- **Remember:** Restart Claude Desktop after config changes 