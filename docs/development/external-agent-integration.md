# External Agent Integration Guide

## Overview

This guide explains how to create an agent that can be called by external agents using the existing MCP (Model Context Protocol) server architecture. The platform provides both HTTP and stdio-based interfaces for external agent integration.

## Architecture

The platform supports two main integration patterns:

1. **HTTP Server** (`mcp-server-http.js`) - RESTful API for external agents
2. **Stdio Server** (`mcp-server-stdio.js`) - MCP protocol for Claude Desktop and other MCP-compatible agents

## Quick Start

### 1. Start the HTTP Server

```bash
# Start with default configuration
NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js

# Or with custom port
MCP_HTTP_PORT=3002 NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js
```

### 2. Test the Server

```bash
# Health check
curl http://localhost:3002/health

# List available tools
curl http://localhost:3002/tools

# Simple query
curl "http://localhost:3002/query?q=show%20all%20companies"
```

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information and available endpoints |
| `/health` | GET | Health check |
| `/tools` | GET | List available tools and their schemas |
| `/call` | POST | Execute tools (MCP-compatible format) |
| `/query` | GET/POST | Simple query interface |
| `/nlp` | POST | NLP processing operations |

### Tool-Specific Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tools/query_knowledge_graph` | GET/POST | Knowledge graph queries |
| `/tools/nlp_processing` | GET/POST | NLP operations |

## Available Tools

### 1. Knowledge Graph Query Tool

**Name**: `query_knowledge_graph`

**Description**: Query the knowledge graph with natural language

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The natural language query to execute against the knowledge graph."
    }
  },
  "required": ["query"]
}
```

**Example Usage**:
```bash
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query_knowledge_graph",
    "arguments": {
      "query": "show all companies"
    }
  }'
```

### 2. NLP Processing Tool

**Name**: `nlp_processing`

**Description**: Process text using Natural Language Processing

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "enum": ["extract_entities", "refine_entities", "extract_graph", "batch_extract_graph", "generate_embeddings"]
    },
    "text": {
      "type": "string",
      "description": "Text to process (for single text operations)"
    },
    "texts": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Array of texts to process (for batch operations)"
    },
    "ontology_name": {
      "type": "string",
      "enum": ["financial", "procurement", "crm", "default"]
    }
  },
  "required": ["operation"]
}
```

**Example Usage**:
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
import requests
import json

class KnowledgeGraphClient:
    def __init__(self, base_url="http://localhost:3002"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'KnowledgeGraph-Client/1.0'
        })
    
    def health_check(self):
        """Check if the server is healthy"""
        response = self.session.get(f"{self.base_url}/health")
        return response.json()
    
    def get_tools(self):
        """Get available tools"""
        response = self.session.get(f"{self.base_url}/tools")
        return response.json()
    
    def query_knowledge_graph(self, query):
        """Query the knowledge graph"""
        payload = {
            "tool": "query_knowledge_graph",
            "arguments": {"query": query}
        }
        response = self.session.post(f"{self.base_url}/call", json=payload)
        return response.json()
    
    def extract_entities(self, text, ontology_name="default"):
        """Extract entities from text"""
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "extract_entities",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        response = self.session.post(f"{self.base_url}/call", json=payload)
        return response.json()
    
    def extract_graph(self, text, ontology_name="default"):
        """Extract knowledge graph from text"""
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "extract_graph",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        response = self.session.post(f"{self.base_url}/call", json=payload)
        return response.json()

# Usage example
client = KnowledgeGraphClient()

# Health check
health = client.health_check()
print(f"Server status: {health['status']}")

# Query knowledge graph
result = client.query_knowledge_graph("show all companies")
print(f"Query result: {result['result']['content']}")

# Extract entities
entities = client.extract_entities(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
print(f"Extracted entities: {entities['result']}")
```

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

class KnowledgeGraphClient {
    constructor(baseUrl = 'http://localhost:3002') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'KnowledgeGraph-Client/1.0'
            }
        });
    }
    
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
    
    async getTools() {
        const response = await this.client.get('/tools');
        return response.data;
    }
    
    async queryKnowledgeGraph(query) {
        const payload = {
            tool: 'query_knowledge_graph',
            arguments: { query }
        };
        const response = await this.client.post('/call', payload);
        return response.data;
    }
    
    async extractEntities(text, ontologyName = 'default') {
        const payload = {
            tool: 'nlp_processing',
            arguments: {
                operation: 'extract_entities',
                text,
                ontology_name: ontologyName
            }
        };
        const response = await this.client.post('/call', payload);
        return response.data;
    }
    
    async extractGraph(text, ontologyName = 'default') {
        const payload = {
            tool: 'nlp_processing',
            arguments: {
                operation: 'extract_graph',
                text,
                ontology_name: ontologyName
            }
        };
        const response = await this.client.post('/call', payload);
        return response.data;
    }
}

// Usage example
async function main() {
    const client = new KnowledgeGraphClient();
    
    try {
        // Health check
        const health = await client.healthCheck();
        console.log(`Server status: ${health.status}`);
        
        // Query knowledge graph
        const result = await client.queryKnowledgeGraph('show all companies');
        console.log(`Query result: ${result.result.content}`);
        
        // Extract entities
        const entities = await client.extractEntities(
            'Apple Inc. CEO Tim Cook announced a $2 billion investment.',
            'financial'
        );
        console.log(`Extracted entities:`, entities.result);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
```

### cURL Examples

```bash
# Health check
curl http://localhost:3002/health

# Get available tools
curl http://localhost:3002/tools

# Query knowledge graph
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query_knowledge_graph",
    "arguments": {
      "query": "show all companies"
    }
  }'

# Extract entities
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "nlp_processing",
    "arguments": {
      "operation": "extract_entities",
      "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
      "ontology_name": "financial"
    }
  }'

# Simple query (alternative endpoint)
curl "http://localhost:3002/query?q=show%20all%20companies"

# NLP processing (alternative endpoint)
curl -X POST http://localhost:3002/nlp \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "extract_graph",
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HTTP_PORT` | `3002` | HTTP server port |
| `NEO4J_DATABASE` | `neo4j` | Target Neo4j database |
| `MCP_ACTIVE_ONTOLOGIES` | `core,fibo,procurement,geonames` | Comma-separated list of active ontologies |
| `NLP_SERVICE_URL` | `http://localhost:8000` | NLP service URL |

### Ontology Configuration

The server automatically configures active ontologies based on the `MCP_ACTIVE_ONTOLOGIES` environment variable:

```bash
# Financial analysis
MCP_ACTIVE_ONTOLOGIES=core,fibo node src/mcp/servers/mcp-server-http.js

# CRM queries
MCP_ACTIVE_ONTOLOGIES=core,crm node src/mcp/servers/mcp-server-http.js

# Multi-domain
MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js
```

## Error Handling

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (invalid input)
- **500**: Internal Server Error

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
import requests

class KnowledgeGraphClient:
    def __init__(self, base_url="http://localhost:3002"):
        self.base_url = base_url
    
    def query_knowledge_graph(self, query):
        try:
            payload = {
                "tool": "query_knowledge_graph",
                "arguments": {"query": query}
            }
            response = requests.post(f"{self.base_url}/call", json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                error_data = e.response.json()
                raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
            else:
                raise Exception(f"Network Error: {str(e)}")
```

## Security Considerations

### Authentication

Currently, the server runs without authentication. For production use:

1. **API Key Authentication**:
```javascript
// Add to client headers
headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
}
```

2. **OAuth2 Integration**:
```javascript
// Implement OAuth2 flow
const token = await getOAuthToken();
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
```

### Rate Limiting

Implement rate limiting in your client:

```python
import time
from functools import wraps

def rate_limit(calls_per_second=10):
    def decorator(func):
        last_call = 0
        min_interval = 1.0 / calls_per_second
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal last_call
            now = time.time()
            if now - last_call < min_interval:
                time.sleep(min_interval - (now - last_call))
            last_call = time.time()
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@rate_limit(calls_per_second=5)
def query_knowledge_graph(self, query):
    # Implementation
    pass
```

## Integration Patterns

### 1. Microservice Integration

```python
# In your microservice
from knowledge_graph_client import KnowledgeGraphClient

class DocumentProcessor:
    def __init__(self):
        self.kg_client = KnowledgeGraphClient()
    
    def process_document(self, document_text):
        # Extract entities
        entities = self.kg_client.extract_entities(document_text, "financial")
        
        # Query knowledge graph
        related_companies = self.kg_client.query_knowledge_graph(
            f"find companies related to {entities[0]['value']}"
        )
        
        return {
            "entities": entities,
            "related_companies": related_companies
        }
```

### 2. Webhook Integration

```python
from flask import Flask, request, jsonify
from knowledge_graph_client import KnowledgeGraphClient

app = Flask(__name__)
kg_client = KnowledgeGraphClient()

@app.route('/webhook/document', methods=['POST'])
def process_document_webhook():
    data = request.json
    document_text = data.get('text')
    
    if not document_text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Extract knowledge graph
        graph = kg_client.extract_graph(document_text, "financial")
        
        # Query for related information
        related = kg_client.query_knowledge_graph(
            f"find relationships for {graph['entities'][0]['value']}"
        )
        
        return jsonify({
            "graph": graph,
            "related": related
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### 3. Batch Processing

```python
import asyncio
import aiohttp
from knowledge_graph_client import KnowledgeGraphClient

class AsyncKnowledgeGraphClient(KnowledgeGraphClient):
    async def batch_extract_graphs(self, texts, ontology_name="default"):
        async with aiohttp.ClientSession() as session:
            tasks = []
            for text in texts:
                task = self.extract_graph_async(session, text, ontology_name)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results
    
    async def extract_graph_async(self, session, text, ontology_name):
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "extract_graph",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        
        async with session.post(f"{self.base_url}/call", json=payload) as response:
            return await response.json()

# Usage
async def process_documents(documents):
    client = AsyncKnowledgeGraphClient()
    results = await client.batch_extract_graphs(documents, "financial")
    return results
```

## Monitoring and Logging

### Health Monitoring

```python
import time
import logging
from knowledge_graph_client import KnowledgeGraphClient

class MonitoredKnowledgeGraphClient(KnowledgeGraphClient):
    def __init__(self, base_url="http://localhost:3002"):
        super().__init__(base_url)
        self.logger = logging.getLogger(__name__)
    
    def health_check(self):
        start_time = time.time()
        try:
            result = super().health_check()
            duration = time.time() - start_time
            self.logger.info(f"Health check successful in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Health check failed in {duration:.2f}s: {e}")
            raise
    
    def query_knowledge_graph(self, query):
        start_time = time.time()
        try:
            result = super().query_knowledge_graph(query)
            duration = time.time() - start_time
            self.logger.info(f"Query '{query}' completed in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Query '{query}' failed in {duration:.2f}s: {e}")
            raise
```

### Metrics Collection

```python
from prometheus_client import Counter, Histogram, Gauge
from knowledge_graph_client import KnowledgeGraphClient

class MetricsKnowledgeGraphClient(KnowledgeGraphClient):
    def __init__(self, base_url="http://localhost:3002"):
        super().__init__(base_url)
        
        # Metrics
        self.query_counter = Counter('kg_queries_total', 'Total knowledge graph queries')
        self.query_duration = Histogram('kg_query_duration_seconds', 'Query duration')
        self.active_connections = Gauge('kg_active_connections', 'Active connections')
    
    def query_knowledge_graph(self, query):
        self.query_counter.inc()
        self.active_connections.inc()
        
        with self.query_duration.time():
            try:
                result = super().query_knowledge_graph(query)
                return result
            finally:
                self.active_connections.dec()
```

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Check if the server is running
   - Verify the port number
   - Check firewall settings

2. **Timeout Errors**:
   - Increase timeout values
   - Check network connectivity
   - Monitor server performance

3. **Invalid Query Errors**:
   - Check query syntax
   - Verify ontology configuration
   - Review error messages

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=true NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js
```

### Testing

```bash
# Test server startup
node src/mcp/servers/mcp-server-http.js --test

# Test with curl
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query_knowledge_graph",
    "arguments": {
      "query": "show all companies"
    }
  }' | jq
```

## Best Practices

1. **Connection Pooling**: Reuse HTTP connections for better performance
2. **Error Handling**: Implement proper error handling and retry logic
3. **Rate Limiting**: Respect rate limits to avoid overwhelming the server
4. **Monitoring**: Monitor response times and error rates
5. **Caching**: Cache frequently requested data when appropriate
6. **Security**: Use HTTPS in production and implement proper authentication
7. **Documentation**: Document your integration patterns and configurations

## Next Steps

1. **Authentication**: Implement API key or OAuth2 authentication
2. **Load Balancing**: Set up load balancing for high availability
3. **Caching**: Implement Redis or similar for query caching
4. **Monitoring**: Set up comprehensive monitoring and alerting
5. **Documentation**: Create API documentation using OpenAPI/Swagger 