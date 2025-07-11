# External Agent Integration - Quick Reference

## Quick Start

### 1. Start the Server
```bash
# Using the startup script
./scripts/start-external-agent-server.sh

# Or manually
NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames MCP_HTTP_PORT=3002 node src/mcp/servers/mcp-server-http.js
```

### 2. Test the Server
```bash
# Health check
curl http://localhost:3002/health

# List tools
curl http://localhost:3002/tools

# Simple query
curl "http://localhost:3002/query?q=show%20all%20companies"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/tools` | GET | List available tools |
| `/call` | POST | Execute tools (MCP format) |
| `/query` | GET/POST | Simple query interface |
| `/nlp` | POST | NLP processing operations |

## Available Tools

### 1. Knowledge Graph Query
```bash
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query_knowledge_graph",
    "arguments": {"query": "show all companies"}
  }'
```

### 2. NLP Processing
```bash
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "nlp_processing",
    "arguments": {
      "operation": "extract_graph",
      "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
      "ontology_name": "financial"
    }
  }'
```

## Client Libraries

### Python Client
```python
from knowledge_graph_client.client import create_client

client = create_client("http://localhost:3002")

# Health check
health = client.health_check()
print(f"Status: {health.status}")

# Query knowledge graph
result = client.query_knowledge_graph("show all companies")
print(f"Result: {result.content}")

# Extract entities
entities = client.extract_entities(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "financial"
)
print(f"Entities: {entities}")
```

### TypeScript Client
```typescript
import { KnowledgeGraphClient } from './src/mcp/clients/knowledge-graph-client';

const client = new KnowledgeGraphClient({
  baseUrl: 'http://localhost:3002'
});

// Health check
const health = await client.healthCheck();
console.log(`Status: ${health.status}`);

// Query knowledge graph
const result = await client.queryKnowledgeGraph("show all companies");
console.log(`Result: ${result.content}`);

// Extract entities
const entities = await client.extractEntities(
  "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
  "financial"
);
console.log(`Entities: ${entities}`);
```

## Configuration

### Environment Variables
```bash
NEO4J_DATABASE=dashboard-killer          # Target database
MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames  # Active ontologies
MCP_HTTP_PORT=3002                      # Server port
NLP_SERVICE_URL=http://localhost:8000   # NLP service URL
```

### Ontology Options
- `core`: Base entities and relationships
- `fibo`: Financial companies, bonds, instruments
- `procurement`: Contracts, tenders, suppliers
- `geonames`: Cities, countries, locations
- `crm`: Leads, opportunities, contacts

## Common Queries

### Knowledge Graph Queries
```bash
# Show all entities of a type
"show all companies"
"show all cities"
"show all contracts"

# Find specific entities
"find Apple Inc"
"find cities in United States"
"find contracts awarded to Microsoft"

# Count entities
"count companies"
"count cities in Europe"
"count contracts in 2024"

# Find relationships
"relationships for Apple Inc"
"connections for New York"
"partners of Microsoft"
```

### NLP Operations
```bash
# Extract entities
operation: "extract_entities"
text: "Apple Inc. CEO Tim Cook announced a $2 billion investment."
ontology_name: "financial"

# Extract knowledge graph
operation: "extract_graph"
text: "Apple Inc. CEO Tim Cook announced a $2 billion investment."
ontology_name: "financial"

# Batch processing
operation: "batch_extract_graph"
texts: ["Text 1", "Text 2", "Text 3"]
ontology_name: "financial"

# Generate embeddings
operation: "generate_embeddings"
texts: ["Text 1", "Text 2", "Text 3"]
```

## Error Handling

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid input)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "tool": "tool_name",
  "stack": "Error stack trace (development only)"
}
```

### Client Error Handling
```python
from knowledge_graph_client.client import KnowledgeGraphClientError

try:
    result = client.query_knowledge_graph("show all companies")
except KnowledgeGraphClientError as e:
    print(f"Client error: {e}")
    print(f"Status code: {e.status_code}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Integration Patterns

### Microservice Integration
```python
from flask import Flask, request, jsonify
from knowledge_graph_client.client import create_client

app = Flask(__name__)
client = create_client("http://localhost:3002")

@app.route('/process-document', methods=['POST'])
def process_document():
    data = request.json
    text = data.get('text')
    
    # Extract entities
    entities = client.extract_entities(text, "financial")
    
    # Query knowledge graph
    related = client.query_knowledge_graph(f"find relationships for {entities[0]['value']}")
    
    return jsonify({
        "entities": entities,
        "related": related.content
    })
```

### Batch Processing
```python
def process_documents(documents):
    client = create_client("http://localhost:3002")
    
    # Process in batches
    batch_size = 10
    results = []
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        graphs = client.batch_extract_graph(batch, "financial")
        results.extend(graphs)
    
    return results
```

## Monitoring

### Health Check
```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "ok",
  "server": "mcp-http-server",
  "version": "1.0.0",
  "database": "dashboard-killer",
  "activeOntologies": ["core", "fibo", "procurement", "geonames"]
}
```

### Server Information
```bash
curl http://localhost:3002/
```

Response:
```json
{
  "server": "mcp-http-server",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "tools": "GET /tools",
    "call": "POST /call",
    "query": "POST /query",
    "nlp": "POST /nlp"
  },
  "database": "dashboard-killer",
  "activeOntologies": ["core", "fibo", "procurement", "geonames"]
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if server is running
   curl http://localhost:3002/health
   
   # Start server if needed
   ./scripts/start-external-agent-server.sh
   ```

2. **Neo4j Not Accessible**
   ```bash
   # Start Neo4j
   docker-compose -f docker-compose.neo4j.yml up -d
   
   # Check Neo4j
   curl http://localhost:7474
   ```

3. **Port Already in Use**
   ```bash
   # Use different port
   MCP_HTTP_PORT=3003 ./scripts/start-external-agent-server.sh
   
   # Or force start
   ./scripts/start-external-agent-server.sh --force
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=true NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js
```

## Security

### Authentication (Future)
```python
# API Key authentication
client = create_client(
    base_url="http://localhost:3002",
    api_key="your-api-key"
)
```

### HTTPS in Production
```python
# Use HTTPS in production
client = create_client("https://your-domain.com")
```

## Performance

### Rate Limiting
- General API: 10 requests/second
- Extraction endpoints: 5 requests/second
- Batch extraction: 3 requests/second

### Timeouts
- Entity extraction: 30 seconds
- Graph extraction: 300 seconds
- Batch extraction: 600 seconds
- Embedding generation: 120 seconds

### Caching
```python
import functools
from knowledge_graph_client.client import create_client

client = create_client("http://localhost:3002")

@functools.lru_cache(maxsize=1000)
def cached_query(query):
    return client.query_knowledge_graph(query)
```

## Examples

### Complete Python Example
```python
#!/usr/bin/env python3
from knowledge_graph_client.client import create_client, KnowledgeGraphClientError

def main():
    try:
        # Create client
        client = create_client("http://localhost:3002")
        
        # Health check
        health = client.health_check()
        print(f"✅ Server: {health.status}")
        print(f"📊 Database: {health.database}")
        print(f"🎯 Ontologies: {', '.join(health.active_ontologies)}")
        
        # Query knowledge graph
        result = client.query_knowledge_graph("show all companies")
        print(f"🔍 Query: {result.query}")
        print(f"📝 Result: {result.content[:200]}...")
        
        # Extract entities
        entities = client.extract_entities(
            "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
            "financial"
        )
        print(f"🏷️  Entities: {len(entities)} found")
        
        # Extract knowledge graph
        graph = client.extract_graph(
            "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
            "financial"
        )
        print(f"🧠 Graph: {len(graph.get('entities', []))} entities, {len(graph.get('relationships', []))} relationships")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Client error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
```

### Complete cURL Example
```bash
#!/bin/bash

BASE_URL="http://localhost:3002"

echo "🔍 Health check..."
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n🔧 Available tools..."
curl -s "$BASE_URL/tools" | jq '.tools[].name'

echo -e "\n🔍 Querying knowledge graph..."
curl -s -X POST "$BASE_URL/call" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query_knowledge_graph",
    "arguments": {"query": "show all companies"}
  }' | jq '.result.content'

echo -e "\n🧠 Extracting entities..."
curl -s -X POST "$BASE_URL/call" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "nlp_processing",
    "arguments": {
      "operation": "extract_entities",
      "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
      "ontology_name": "financial"
    }
  }' | jq '.result'
``` 