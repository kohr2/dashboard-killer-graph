# MCP Server for Knowledge Graph Platform

This MCP (Model Context Protocol) server provides agents with access to the knowledge graph platform, enabling them to query entities, relationships, and perform reasoning across multiple ontologies.

## Overview

The MCP server exposes the knowledge graph as a tool that agents can use to:
- Query entities and relationships
- Search across multiple ontologies (FIBO, Procurement, GeoNames, etc.)
- Perform natural language queries
- Get structured data from the Neo4j knowledge graph

## Configuration for Agents

### For Claude Desktop

1. **Copy the configuration** to your Claude Desktop config directory:
   ```bash
   # On macOS
   cp src/mcp/config/mcp-server-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # On Windows
   copy src\mcp\config\mcp-server-config.json %APPDATA%\Claude\claude_desktop_config.json
   
   # On Linux
   cp src/mcp/config/mcp-server-config.json ~/.config/Claude/claude_desktop_config.json
   ```

2. **Update the paths** in the config to match your system:
   ```json
   {
     "mcpServers": {
       "knowledge-graph": {
         "command": "node",
         "args": [
           "/path/to/your/project/src/mcp/servers/mcp-server-stdio.js"
         ],
         "cwd": "/path/to/your/project",
         "env": {
           "NEO4J_DATABASE": "dashboard-killer",
           "MCP_ACTIVE_ONTOLOGIES": "core,fibo,procurement,geonames"
         }
      }
     }
   }
   ```

### For Other Agents

Use the generic configuration format:

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

## Environment Variables

### Required
- `NEO4J_DATABASE`: Target database name (e.g., "dashboard-killer", "fibo", "procurement", "geonames")

### Optional
- `MCP_ACTIVE_ONTOLOGIES`: Comma-separated list of ontologies to enable
  - Default: "core,fibo,procurement,geonames"
  - Options: "core", "fibo", "procurement", "geonames", "crm", "sp500"

## Available Ontologies

### Core
- Base entities and relationships
- Always enabled

### FIBO (Financial Industry Business Ontology)
- Financial entities: JointStockCompany, PrivatelyHeldCompany, Bond, Share
- Relationships: hasDateOfRegistration, hasRegisteredAddress, hasBaseCurrency

### Procurement (ePO)
- Procurement entities: ProcurementProcedure, Contract, Tender, EconomicOperator
- Relationships: hasContractingAuthority, hasTender, hasAward

### GeoNames
- Geographic entities: City, Country, AdminRegion, Feature
- Relationships: LOCATED_IN, NEAR, HAS_FEATURE
- 159,045 cities from 195+ countries

### CRM
- Customer relationship entities: Lead, Opportunity, Account, Contact
- Relationships: hasContact, hasOpportunity, belongsToAccount

### S&P 500
- Company entities: Company, Industry, Sector, StockExchange
- Relationships: BELONGS_TO_INDUSTRY, LISTED_ON, SUBSIDIARY_OF

## Usage Examples

### Basic Queries
```
"show all companies"
"find organizations"
"list cities in United States"
"count contracts"
"relationships for Apple Inc"
```

### Advanced Queries
```
"show all companies in the technology sector"
"find cities with population over 1 million"
"contracts awarded to Microsoft"
"companies listed on NYSE"
"cities near New York"
```

### Multi-Ontology Queries
```
"show financial companies with procurement contracts"
"cities where major companies are headquartered"
"organizations with both financial and procurement data"
```

## Tool Description

The MCP server provides a tool called `query_knowledge_graph` with the following capabilities:

- **Natural Language Processing**: Understands queries in plain English
- **Multi-Ontology Support**: Queries across all active ontologies
- **Entity Recognition**: Recognizes entity types and names
- **Relationship Queries**: Finds connections between entities
- **Aggregation**: Count, group, and analyze data
- **Spatial Queries**: Geographic and location-based searches
- **Temporal Queries**: Time-based filtering and analysis

## Response Format

The tool returns structured responses including:
- **Entities**: Found entities with properties
- **Relationships**: Connections between entities
- **Counts**: Summary statistics
- **Natural Language**: Human-readable explanations
- **Metadata**: Query execution details

## Setup Requirements

### Prerequisites
1. **Node.js**: Version 18 or higher
2. **Neo4j Database**: Running and accessible
3. **Project Dependencies**: All npm packages installed

### Database Setup
```bash
# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Verify connection
npm run test:neo4j
```

### Environment Configuration
```bash
# Copy environment template
cp config/environment.example.js .env

# Configure database connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=dashboard-killer
```

## Troubleshooting

### Common Issues

1. **Server not starting**:
   ```bash
   # Check Node.js version
   node --version
   
   # Verify dependencies
   npm install
   
   # Test server directly
   node src/mcp/servers/mcp-server-stdio.js
   ```

2. **Database connection failed**:
   ```bash
   # Check Neo4j status
   docker ps | grep neo4j
   
   # Test connection
   npm run test:neo4j
   ```

3. **Ontology not found**:
   ```bash
   # Check available ontologies
   ls ontologies/
   
   # Verify ontology configuration
   cat ontologies/fibo/config.json
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node src/mcp/servers/mcp-server-stdio.js

# Check MCP server logs
tail -f logs/mcp-server.log
```

## Security Considerations

- **Authentication**: MCP server runs with admin privileges
- **Database Access**: Limited to configured database
- **Query Limits**: Results automatically limited to 10 items
- **Input Validation**: All queries are validated and sanitized

## Performance

- **Query Optimization**: Automatic query optimization
- **Caching**: Entity and relationship caching
- **Connection Pooling**: Efficient database connections
- **Memory Management**: Automatic cleanup and garbage collection

## Integration Examples

### Claude Desktop
```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["./src/mcp/servers/mcp-server-stdio.js"],
      "cwd": "/path/to/project",
      "env": {
        "NEO4J_DATABASE": "fibo",
        "MCP_ACTIVE_ONTOLOGIES": "core,fibo"
      }
    }
  }
}
```

### Custom Agent
```javascript
// Example agent integration
const mcpClient = new MCPClient({
  servers: {
    "knowledge-graph": {
      command: "node",
      args: ["./src/mcp/servers/mcp-server-stdio.js"],
      cwd: process.cwd(),
      env: {
        NEO4J_DATABASE: "dashboard-killer",
        MCP_ACTIVE_ONTOLOGIES: "core,fibo,procurement,geonames"
      }
    }
  }
});

// Query the knowledge graph
const result = await mcpClient.callTool("query_knowledge_graph", {
  query: "show all companies in the technology sector"
});
```

## Support

For issues and questions:
- Check the [main project documentation](../../docs/README.md)
- Review [troubleshooting guides](../../docs/development/test-troubleshooting-guide.md)
- Check [system status](../../docs/development/system-status.md) 