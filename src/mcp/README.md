# MCP Server for Knowledge Graph Platform

MCP server providing agents access to the knowledge graph platform for querying entities, relationships, and reasoning across multiple ontologies.

## Quick Setup

### For Claude Desktop
```bash
# Copy config
cp src/mcp/config/mcp-server-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Update paths in config to match your system
```

### For Other Agents
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

**Required:**
- `NEO4J_DATABASE`: Target database (e.g., "dashboard-killer", "fibo", "procurement", "geonames")

**Optional:**
- `MCP_ACTIVE_ONTOLOGIES`: Comma-separated ontologies (default: "core,fibo,procurement,geonames")

## Available Ontologies

| Ontology | Entities | Relationships |
|----------|----------|---------------|
| **Core** | Base entities | Base relationships |
| **FIBO** | JointStockCompany, Bond, Share | hasDateOfRegistration, hasBaseCurrency |
| **Procurement** | Contract, Tender, EconomicOperator | hasContractingAuthority, hasAward |
| **GeoNames** | City, Country, AdminRegion | LOCATED_IN, NEAR, HAS_FEATURE |
| **CRM** | Lead, Opportunity, Account | hasContact, belongsToAccount |
| **S&P 500** | Company, Industry, Sector | BELONGS_TO_INDUSTRY, LISTED_ON |

## Usage Examples

### Basic Queries
```
"show all companies"
"find cities in United States"
"count contracts"
"relationships for Apple Inc"
```

### Advanced Queries
```
"companies in technology sector"
"cities with population over 1 million"
"contracts awarded to Microsoft"
"cities near New York"
```

## Tool Description

Tool: `query_knowledge_graph`

**Capabilities:**
- Natural language processing
- Multi-ontology queries
- Entity recognition
- Relationship queries
- Aggregation and analysis
- Spatial and temporal queries

**Response Format:**
- Entities with properties
- Relationships
- Counts and statistics
- Natural language explanations
- Query metadata

## Setup Requirements

### Prerequisites
- Node.js 18+
- Neo4j Database running
- Project dependencies installed

### Database Setup
```bash
# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Verify connection
npm run test:neo4j
```

## Troubleshooting

### Common Issues
```bash
# Server not starting
node --version
npm install
node src/mcp/servers/mcp-server-stdio.js

# Database connection failed
docker ps | grep neo4j
npm run test:neo4j

# Debug mode
DEBUG=* node src/mcp/servers/mcp-server-stdio.js
```

## Security & Performance

- **Authentication**: Admin privileges required
- **Database Access**: Limited to configured database
- **Query Limits**: Results limited to 10 items
- **Optimization**: Automatic query optimization and caching
- **Connection Pooling**: Efficient database connections 