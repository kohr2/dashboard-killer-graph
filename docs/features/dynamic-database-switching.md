# Dynamic Database Switching

The MCP server now supports dynamic database switching, allowing clients to specify which database to query without restarting the server.

## Overview

When the MCP server receives a query request, it can now accept an optional `database` parameter that specifies which Neo4j database to use for the query. This enables:

- Querying multiple databases from a single MCP server instance
- Switching between different ontology datasets on-the-fly
- Maintaining separate data contexts for different use cases

## How It Works

### 1. MCP Tool Schema

The `queryGraph` tool now accepts an optional `database` parameter:

```json
{
  "name": "queryGraph",
  "description": "Query the knowledge graph with dynamic database support",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The natural language query to execute against the knowledge graph."
      },
      "database": {
        "type": "string",
        "description": "Optional database name to switch to before executing the query. If not specified, uses the default database."
      }
    },
    "required": ["query"]
  }
}
```

### 2. Database Switching Process

When a `database` parameter is provided:

1. **Validation**: The system verifies the requested database exists
2. **Switching**: The Neo4j connection switches to the specified database
3. **Query Execution**: The query is executed against the new database
4. **Response**: Results are returned from the specified database

### 3. Implementation Details

#### Neo4jConnection Updates

The `Neo4jConnection` class now supports:

```typescript
// Switch to a different database
await neo4jConnection.switchDatabase('procurement');

// Get session for specific database
const session = neo4jConnection.getSession('financial');

// Get current database
const currentDb = neo4jConnection.getDatabase();
```

#### ChatService Integration

The `ChatService.handleQuery()` method now accepts an optional database parameter:

```typescript
// Query with default database
const result1 = await chatService.handleQuery(user, "show all persons");

// Query with specific database
const result2 = await chatService.handleQuery(user, "show all persons", "financial");
```

## Usage Examples

### MCP Client Example

```javascript
// Query default database
const response1 = await mcpClient.callTool('queryGraph', {
  query: 'show all persons'
});

// Query specific database
const response2 = await mcpClient.callTool('queryGraph', {
  query: 'show all persons',
  database: 'financial'
});

// Query another database
const response3 = await mcpClient.callTool('queryGraph', {
  query: 'show all contracts',
  database: 'procurement'
});
```

### Available Databases

The system supports any Neo4j database that exists in your Neo4j instance. Common databases include:

- `procurement` - Procurement ontology data
- `financial` - Financial ontology data  
- `crm` - Customer relationship management data
- `neo4j` - Default database
- `system` - Neo4j system database (read-only)

## Error Handling

### Database Not Found

If the requested database doesn't exist:

```
Error: Database 'nonexistent' does not exist
```

### Invalid Database Names

System databases (`neo4j`, `system`) are protected from modification.

## Configuration

### Environment Variables

The default database is still controlled by:

```bash
NEO4J_DATABASE=procurement
```

### MCP Server Startup

The MCP server starts with the default database but can switch dynamically:

```bash
# Start with procurement database
NEO4J_DATABASE=procurement npm run mcp:procurement

# Start with financial database  
NEO4J_DATABASE=financial npm run mcp:financial
```

## Benefits

1. **Flexibility**: Query any database without server restart
2. **Efficiency**: Single MCP server instance for multiple databases
3. **Isolation**: Keep different ontology datasets separate
4. **Performance**: No need to restart services when switching contexts

## Limitations

1. **Database Existence**: Requested database must exist in Neo4j
2. **Connection Pooling**: Uses the same Neo4j driver instance
3. **Schema Differences**: Different databases may have different schemas
4. **Ontology Context**: Ontology plugins are loaded globally, not per database

## Future Enhancements

- Database-specific ontology loading
- Connection pooling per database
- Database creation on-demand
- Schema validation per database 