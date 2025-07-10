# MCP Server Configuration

## Quick Setup

```bash
# 1. Run setup script
./src/mcp/setup-agent.sh

# 2. Restart your agent
```

## Configuration

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-simple.js"],
      "cwd": ".",
      "env": {
        "NEO4J_DATABASE": "dashboard-killer",
        "MCP_ACTIVE_ONTOLOGIES": "core,fibo,procurement,geonames"
      }
    }
  }
}
```

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

# Test server
node src/mcp/servers/mcp-server-simple.js --test
``` 