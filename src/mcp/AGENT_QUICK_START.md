# 🚀 Agent Quick Start - Knowledge Graph MCP Server

## One-Minute Setup

### 1. Copy Configuration
```bash
# Run the setup script
./src/mcp/setup-agent.sh
```

### 2. Restart Your Agent
Restart Claude Desktop or your MCP-compatible agent.

### 3. Start Using
The `query_knowledge_graph` tool is now available!

## Quick Examples

### Basic Queries
```
"show all companies"
"find cities in United States"
"count contracts"
"list organizations"
```

### Advanced Queries
```
"show companies in technology sector"
"cities with population over 1 million"
"contracts awarded to Microsoft"
"companies listed on NYSE"
```

### Multi-Ontology Queries
```
"financial companies with procurement contracts"
"cities where major companies are headquartered"
"organizations with both financial and procurement data"
```

## Configuration Options

### Change Database
```json
{
  "env": {
    "NEO4J_DATABASE": "fibo"  // Options: dashboard-killer, fibo, procurement, geonames
  }
}
```

### Enable Specific Ontologies
```json
{
  "env": {
    "MCP_ACTIVE_ONTOLOGIES": "core,fibo,geonames"  // Comma-separated list
  }
}
```

## Available Ontologies

| Ontology | Entities | Focus |
|----------|----------|-------|
| **FIBO** | Companies, Bonds, Shares | Financial Industry |
| **Procurement** | Contracts, Tenders, Suppliers | Public Procurement |
| **GeoNames** | Cities, Countries, Regions | Geographic Data |
| **CRM** | Leads, Opportunities, Accounts | Customer Relations |
| **S&P 500** | Companies, Industries, Sectors | Stock Market |

## Response Format

The tool returns:
- **Entities**: Found data with properties
- **Relationships**: Connections between entities  
- **Natural Language**: Human-readable explanations
- **Counts**: Summary statistics

## Troubleshooting

### Common Issues
1. **"Server not found"** → Run `./src/mcp/setup-agent.sh`
2. **"Database error"** → Start Neo4j: `docker-compose -f docker-compose.neo4j.yml up -d`
3. **"No results"** → Check `MCP_ACTIVE_ONTOLOGIES` configuration

### Test Connection
```bash
node src/mcp/servers/mcp-server-simple.js --test
```

## Full Documentation
- 📚 [Complete MCP Guide](README.md)
- 🔧 [Configuration Details](README.md#configuration-for-agents)
- 🧪 [Testing & Debugging](README.md#troubleshooting) 