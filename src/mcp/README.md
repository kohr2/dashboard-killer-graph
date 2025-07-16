# MCP Server for Knowledge Graph Platform

MCP server providing agents access to the knowledge graph platform for querying entities, relationships, and reasoning across multiple ontologies.

## 🚀 Quick Start

### Using NPM Scripts (Recommended)

The platform now supports multiple transport methods with convenient npm scripts:

```bash
# Interactive transport selection
npm run dev:mcp:interactive

# Direct transport selection
npm run dev:mcp:stdio    # STDIO transport (for Claude Desktop)
npm run dev:mcp:http     # HTTP transport (for web clients)

# Pre-configured ontology-specific servers
npm run mcp:stdio        # Default with all ontologies
npm run mcp:http         # HTTP server with all ontologies
npm run mcp:fibo         # FIBO ontology only
npm run mcp:procurement  # Procurement ontology only
npm run mcp:procurement-only  # Procurement database + ontology only (no core)
npm run mcp:geonames     # GeoNames ontology only

# Test all transport options
npm run mcp:test
```

### Transport Methods

#### 1. STDIO Transport (Default)
- **Use case**: Claude Desktop, command-line tools
- **Command**: `npm run dev:mcp:stdio`
- **Configuration**: Uses standard input/output for communication
- **Best for**: Direct integration with AI assistants

#### 2. HTTP Transport
- **Use case**: Web applications, REST clients
- **Command**: `npm run dev:mcp:http`
- **Port**: 3002 (configurable via `MCP_HTTP_PORT`)
- **Endpoints**:
  - `GET /health` - Health check
  - `GET /tools` - List available tools
  - `POST /call` - Execute tool calls
  - `POST /query` - Direct query endpoint
- **Best for**: Web-based integrations

### For Claude Desktop
```bash
# Copy config (currently configured for procurement-only)
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
        "NEO4J_DATABASE": "procurement",
        "MCP_ACTIVE_ONTOLOGIES": "procurement"
      }
    }
  }
}
```

## Environment Variables

**Required:**
- `NEO4J_DATABASE`: Target database (e.g., "procurement", "fibo", "geonames", "dashboard-killer")

**Optional:**
- `MCP_ACTIVE_ONTOLOGIES`: Comma-separated ontologies (default: "procurement")
- `MCP_HTTP_PORT`: HTTP server port (default: 3002)

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

### Basic Queries (Procurement Focus)
```
"show all contracts"
"find tenders in United States"
"count economic operators"
"relationships for [contract name]"
```

### Advanced Queries (Procurement Focus)
```
"contracts awarded to [company]"
"tenders with value over [amount]"
"economic operators in [sector]"
"contracts near [location]"
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
# Start Neo4j Desktop (recommended)
# Or use Docker:
docker-compose -f docker-compose.neo4j.yml up -d

# Verify connection
npm run test:neo4j
```

## Testing Transport Options

Use the interactive test script to verify all transport methods:

```bash
npm run mcp:test
```

This will present a menu to:
1. Test STDIO transport
2. Test HTTP transport  
3. Test both transports simultaneously
4. Exit

## Troubleshooting

### Common Issues
```bash
# Server not starting
node --version
npm install
npm run mcp:test

# Database connection failed
docker ps | grep neo4j
npm run test:neo4j

# Debug mode
DEBUG=* npm run dev:mcp:stdio
```

### Transport-Specific Issues

**STDIO Transport:**
- Ensure no other processes are using stdin/stdout
- Check that the calling application supports MCP protocol

**HTTP Transport:**
- Verify port 3002 is available
- Check firewall settings
- Test with: `curl http://localhost:3002/health`

## Security & Performance

- **Authentication**: Admin privileges required
- **Database Access**: Limited to configured database
- **Query Limits**: Results limited to 10 items
- **Optimization**: Automatic query optimization and caching
- **Connection Pooling**: Efficient database connections
- **CORS**: Enabled for HTTP transport
- **Rate Limiting**: Built-in request throttling 