# MCP Server Configuration

## Quick Setup

```bash
./src/mcp/setup-agent.sh
# Restart your agent
```

## Configuration

### Stdio (Default)
```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-stdio.js"],
      "cwd": ".",
      "env": {
        "NEO4J_DATABASE": "dashboard-killer",
        "MCP_ACTIVE_ONTOLOGIES": "core,fibo,procurement,geonames"
      }
    }
  }
}
```

### HTTP (Alternative)
```json
{
  "mcpServers": {
    "knowledge-graph-http": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-http.js"],
      "cwd": ".",
      "env": {
        "NEO4J_DATABASE": "dashboard-killer",
        "MCP_ACTIVE_ONTOLOGIES": "core,fibo,procurement,geonames",
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

**Examples:**
- `"show all companies"`
- `"find cities in United States"`
- `"count contracts"`
- `"companies in technology sector"`

## Available Data

| Database | Content |
|----------|---------|
| `dashboard-killer` | All ontologies |
| `fibo` | Financial companies, bonds |
| `procurement` | Contracts, tenders |
| `geonames` | 159K cities, countries |
| `crm` | Leads, opportunities |

## Troubleshooting

```bash
# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Test servers
node src/mcp/servers/mcp-server-stdio.js --test
node src/mcp/servers/mcp-server-http.js
``` 