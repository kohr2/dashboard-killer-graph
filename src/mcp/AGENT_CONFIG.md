# MCP Server Configuration

## Quick Setup

```bash
./src/mcp/setup-agent.sh
# Restart your agent
```

## Configuration

### Stdio (Default) - with Dynamic Database Switching
```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-stdio.js"],
      "cwd": ".",
      "env": {
        "NEO4J_DATABASE": "procurement",
        "MCP_ACTIVE_ONTOLOGIES": "core,procurement"
      }
    }
  }
}
```

### HTTP (Alternative) - with Dynamic Database Switching
```json
{
  "mcpServers": {
    "knowledge-graph-http": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-http.js"],
      "cwd": ".",
      "env": {
        "NEO4J_DATABASE": "procurement",
        "MCP_ACTIVE_ONTOLOGIES": "core,procurement",
        "MCP_HTTP_PORT": "3002"
      }
    }
  }
}
```

**HTTP Endpoints:**
- Health: `http://localhost:3002/health`
- Tools: `http://localhost:3002/tools`
- Query: `http://localhost:3002/query?q=show all companies`

## Usage

Tool: `query_knowledge_graph`

**Basic Examples:**
- `"show all companies"`
- `"find cities in United States"`
- `"count contracts"`
- `"companies in technology sector"`

**Dynamic Database Switching Examples:**
- `"show all persons"` (uses default database)
- `"show all persons"` with database: `"procurement"`
- `"show all contracts"` with database: `"financial"`
- `"show all customers"` with database: `"crm"`

**Database Parameter:**
The tool now accepts an optional `database` parameter to switch between different databases:
```json
{
  "query": "show all persons",
  "database": "procurement"
}
```

## Available Data

| Database | Content | Status |
|----------|---------|--------|
| `procurement` | Contracts, tenders, persons | ✅ Active |
| `financial` | Financial companies, bonds | 🔄 Available |
| `crm` | Leads, opportunities | 🔄 Available |
| `geonames` | 159K cities, countries | 🔄 Available |
| `neo4j` | Default database | 🔄 Available |

**Dynamic Database Switching**: The MCP server can now switch between databases on-the-fly using the `database` parameter in tool calls.

## Troubleshooting

```bash
# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Test servers
node src/mcp/servers/mcp-server-stdio.js --test
node src/mcp/servers/mcp-server-http.js
``` 