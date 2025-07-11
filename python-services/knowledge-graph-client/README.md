# Knowledge Graph Client for Python

A Python client library for interacting with the Knowledge Graph MCP HTTP server. This client enables external agents to easily integrate with the knowledge graph platform for querying, entity extraction, and NLP processing.

## Features

- **Health Monitoring**: Check server status and configuration
- **Tool Discovery**: Get available tools and their schemas
- **Knowledge Graph Queries**: Natural language queries against the knowledge graph
- **NLP Processing**: Entity extraction, graph generation, and embedding creation
- **Batch Processing**: Process multiple texts efficiently
- **Error Handling**: Comprehensive error handling with retry logic
- **Authentication**: Support for API key authentication
- **Type Safety**: Full type hints and dataclass support

## Installation

### Prerequisites

- Python 3.7+
- `requests` library

```bash
pip install requests
```

### Setup

1. Copy the client files to your project:
```bash
cp -r python-services/knowledge-graph-client/ your-project/
```

2. Import the client:
```python
from knowledge_graph_client.client import KnowledgeGraphClient, create_client
```

## Quick Start

### Basic Usage

```python
from knowledge_graph_client.client import create_client

# Create client
client = create_client("http://localhost:3002")

# Health check
health = client.health_check()
print(f"Server status: {health.status}")

# Query knowledge graph
result = client.query_knowledge_graph("show all companies")
print(f"Query result: {result.content}")

# Extract entities
entities = client.extract_entities(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
print(f"Found {len(entities)} entities")
```

### Convenience Functions

```python
from knowledge_graph_client.client import health_check, query_graph, extract_entities_from_text

# Quick health check
health = health_check("http://localhost:3002")

# Quick query
result = query_graph("show all companies", "http://localhost:3002")

# Quick entity extraction
entities = extract_entities_from_text(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "financial"
)
```

## API Reference

### Client Configuration

```python
client = KnowledgeGraphClient(
    base_url="http://localhost:3002",  # Server URL
    timeout=300,                       # Request timeout in seconds
    retries=3,                         # Number of retries
    api_key="your-api-key"            # Optional API key
)
```

### Core Methods

#### Health Check
```python
health = client.health_check()
# Returns: HealthResponse(status, server, version, database, active_ontologies)
```

#### Tool Discovery
```python
tools = client.get_tools()
# Returns: List[Tool(name, description, input_schema)]
```

#### Knowledge Graph Queries
```python
# Natural language query
result = client.query_knowledge_graph("show all companies")
# Returns: QueryResponse(content, query, timestamp)

# Simple query (alternative endpoint)
result = client.query("show all companies")
# Returns: QueryResponse(content, query, timestamp)
```

#### NLP Processing

##### Entity Extraction
```python
entities = client.extract_entities(
    text="Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
# Returns: List[Dict] - extracted entities
```

##### Entity Refinement
```python
refined = client.refine_entities(
    text="Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
# Returns: Dict - refined entities with LLM enhancement
```

##### Knowledge Graph Extraction
```python
graph = client.extract_graph(
    text="Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
# Returns: Dict - extracted knowledge graph with entities and relationships
```

##### Batch Processing
```python
texts = [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion."
]

graphs = client.batch_extract_graph(texts, "financial")
# Returns: List[Dict] - knowledge graphs for each text
```

##### Embedding Generation
```python
embeddings = client.generate_embeddings([
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion."
])
# Returns: List[Dict] - embeddings for each text
```

#### Advanced Methods

##### Direct Tool Calls
```python
result = client.call_tool("query_knowledge_graph", {"query": "show all companies"})
# Returns: CallResponse(tool, result, timestamp)
```

##### Alternative NLP Endpoint
```python
result = client.process_nlp(
    operation="extract_entities",
    text="Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)
# Returns: NLPResponse(operation, result, ontology_used, timestamp)
```

##### Server Information
```python
info = client.get_server_info()
# Returns: Dict - server information and available endpoints
```

## Error Handling

The client provides comprehensive error handling:

```python
from knowledge_graph_client.client import KnowledgeGraphClientError

try:
    client = create_client("http://localhost:3002")
    result = client.query_knowledge_graph("show all companies")
except KnowledgeGraphClientError as e:
    print(f"Client error: {e}")
    print(f"Status code: {e.status_code}")
    print(f"Response: {e.response}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### Error Types

- **KnowledgeGraphClientError**: Client-specific errors with status codes and response data
- **Connection Errors**: Network connectivity issues
- **Timeout Errors**: Request timeout issues
- **Validation Errors**: Invalid input parameters

## Configuration

### Environment Variables

```bash
# Server configuration
KNOWLEDGE_GRAPH_URL=http://localhost:3002
KNOWLEDGE_GRAPH_API_KEY=your-api-key
KNOWLEDGE_GRAPH_TIMEOUT=300
KNOWLEDGE_GRAPH_RETRIES=3
```

### Client Configuration

```python
import os
from knowledge_graph_client.client import create_client

client = create_client(
    base_url=os.getenv("KNOWLEDGE_GRAPH_URL", "http://localhost:3002"),
    timeout=int(os.getenv("KNOWLEDGE_GRAPH_TIMEOUT", "300")),
    retries=int(os.getenv("KNOWLEDGE_GRAPH_RETRIES", "3")),
    api_key=os.getenv("KNOWLEDGE_GRAPH_API_KEY")
)
```

## Integration Examples

### Microservice Integration

```python
from flask import Flask, request, jsonify
from knowledge_graph_client.client import create_client

app = Flask(__name__)
client = create_client("http://localhost:3002")

@app.route('/process-document', methods=['POST'])
def process_document():
    data = request.json
    document_text = data.get('text')
    
    if not document_text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Extract entities
        entities = client.extract_entities(document_text, "financial")
        
        # Query knowledge graph
        related = client.query_knowledge_graph(
            f"find relationships for {entities[0]['value']}"
        )
        
        return jsonify({
            "entities": entities,
            "related": related.content
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### Batch Processing

```python
import asyncio
from knowledge_graph_client.client import create_client

async def process_documents(documents):
    client = create_client("http://localhost:3002")
    
    # Process documents in batches
    batch_size = 10
    results = []
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        graphs = client.batch_extract_graph(batch, "financial")
        results.extend(graphs)
    
    return results

# Usage
documents = [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion.",
    # ... more documents
]

results = asyncio.run(process_documents(documents))
```

### Monitoring and Logging

```python
import logging
import time
from knowledge_graph_client.client import create_client

class MonitoredKnowledgeGraphClient:
    def __init__(self, base_url="http://localhost:3002"):
        self.client = create_client(base_url)
        self.logger = logging.getLogger(__name__)
    
    def query_knowledge_graph(self, query):
        start_time = time.time()
        try:
            result = self.client.query_knowledge_graph(query)
            duration = time.time() - start_time
            self.logger.info(f"Query '{query}' completed in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Query '{query}' failed in {duration:.2f}s: {e}")
            raise

# Usage
client = MonitoredKnowledgeGraphClient()
result = client.query_knowledge_graph("show all companies")
```

## Testing

### Run Examples

```bash
# Make sure the server is running first
NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js

# Run examples
python example.py
```

### Unit Tests

```python
import unittest
from unittest.mock import patch, Mock
from knowledge_graph_client.client import KnowledgeGraphClient, KnowledgeGraphClientError

class TestKnowledgeGraphClient(unittest.TestCase):
    def setUp(self):
        self.client = KnowledgeGraphClient("http://localhost:3002")
    
    @patch('requests.Session.request')
    def test_health_check(self, mock_request):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "ok",
            "server": "mcp-http-server",
            "version": "1.0.0",
            "database": "dashboard-killer",
            "activeOntologies": ["core", "fibo"]
        }
        mock_request.return_value = mock_response
        
        health = self.client.health_check()
        self.assertEqual(health.status, "ok")
        self.assertEqual(health.database, "dashboard-killer")

if __name__ == '__main__':
    unittest.main()
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

```python
import logging
logging.basicConfig(level=logging.DEBUG)

client = create_client("http://localhost:3002")
# All requests will be logged
```

### Health Check

```python
try:
    health = client.health_check()
    print(f"✅ Server is healthy: {health.status}")
    print(f"📊 Database: {health.database}")
    print(f"🎯 Active ontologies: {', '.join(health.active_ontologies)}")
except Exception as e:
    print(f"❌ Server is not healthy: {e}")
```

## Best Practices

1. **Connection Pooling**: Reuse client instances for better performance
2. **Error Handling**: Implement proper error handling and retry logic
3. **Rate Limiting**: Respect rate limits to avoid overwhelming the server
4. **Monitoring**: Monitor response times and error rates
5. **Caching**: Cache frequently requested data when appropriate
6. **Security**: Use HTTPS in production and implement proper authentication
7. **Documentation**: Document your integration patterns and configurations

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the example code
3. Check server logs for detailed error information
4. Verify server configuration and environment variables

## License

This client library is part of the Knowledge Graph platform and follows the same licensing terms. 