# NLP Service Quick Start Guide

This guide will help you quickly deploy and use the NLP Service for external applications.

## Prerequisites

- Docker and Docker Compose installed
- OpenAI API key (optional, for LLM features)
- At least 4GB RAM available

## Quick Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make the script executable (if not already done)
chmod +x scripts/deploy-nlp-service.sh

# Deploy with default settings
./scripts/deploy-nlp-service.sh

# Deploy with OpenAI API key
OPENAI_API_KEY=sk-your-key-here ./scripts/deploy-nlp-service.sh

# Deploy using docker-compose
./scripts/deploy-nlp-service.sh compose

# Deploy production version with Nginx
./scripts/deploy-nlp-service.sh production
```

### Option 2: Manual Docker Deployment

```bash
# Build and run the service
cd python-services/nlp-service
docker build -t nlp-service .
docker run -d -p 8000:8000 -e OPENAI_API_KEY=your-key nlp-service

# Or using docker-compose
docker-compose up -d nlp-service
```

### Option 3: Local Development

```bash
# Set up Python environment
cd python-services/nlp-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Verify Installation

Check if the service is running:

```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Quick API Test

### Extract Entities

```bash
curl -X POST http://localhost:8000/extract-entities \
  -H "Content-Type: application/json" \
  -d '{"text": "Apple Inc. CEO Tim Cook announced a $2 billion investment."}'
```

### Extract Knowledge Graph

```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy."}'
```

## Using the Python Client SDK

### Install the Client

```bash
# Copy the client to your project
cp python-services/nlp-service/client.py your-project/

# Or install requirements
pip install requests
```

### Basic Usage

```python
from client import NLPServiceClient, extract_entities, extract_graph

# Using the client class
client = NLPServiceClient("http://localhost:8000")

# Extract entities
entities = client.extract_entities("Apple Inc. CEO Tim Cook announced a $2 billion investment.")
for entity in entities:
    print(f"{entity.value} ({entity.type})")

# Extract knowledge graph
graph = client.extract_graph("Apple Inc. CEO Tim Cook announced a $2 billion investment.")
print(f"Found {len(graph.entities)} entities and {len(graph.relationships)} relationships")

# Using convenience functions
entities = extract_entities("Microsoft Corp. reported quarterly earnings of $50 billion.")
graph = extract_graph("Google's Sundar Pichai discussed AI strategy.")
```

### Batch Processing

```python
from client import batch_extract_graph

texts = [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion.",
    "Google's Sundar Pichai discussed AI strategy."
]

graphs = batch_extract_graph(texts)
for i, graph in enumerate(graphs):
    print(f"Document {i+1}: {len(graph.entities)} entities, {len(graph.relationships)} relationships")
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM features | None |
| `ENABLE_PROMPT_DEBUG` | Enable prompt debugging | 0 |
| `LOG_LEVEL` | Logging level | INFO |

### Ontology Configuration

The service can be configured with custom ontologies:

```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Update ontology
client.update_ontology(
    entity_types=["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
    relationship_types=["WORKS_FOR", "INVESTS", "OWNS"],
    compact_ontology={
        "e": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
        "r": [
            ["PERSON_NAME", "WORKS_FOR", "COMPANY_NAME"],
            ["COMPANY_NAME", "INVESTS", "MONETARY_AMOUNT"]
        ]
    }
)
```

## Production Deployment

### Using Docker Compose Production

```bash
# Deploy with Nginx reverse proxy
./scripts/deploy-nlp-service.sh production
```

### Manual Production Setup

1. **Set up SSL certificates**:
   ```bash
   mkdir ssl
   # Add your cert.pem and key.pem files to the ssl directory
   ```

2. **Configure environment variables**:
   ```bash
   export OPENAI_API_KEY=your-key
   export LOG_LEVEL=INFO
   ```

3. **Deploy with docker-compose**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

### Scaling

For high-traffic applications:

```bash
# Scale the service
docker-compose up -d --scale nlp-service=3

# Or use Docker Swarm
docker stack deploy -c docker-compose.production.yml nlp-stack
```

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health

# Monitor logs
docker logs nlp-service-container
```

### Performance Monitoring

The service includes built-in timing information in responses. For production monitoring, consider:

- Prometheus metrics
- Application Performance Monitoring (APM) tools
- Custom logging and alerting

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   # Check Docker logs
   docker logs nlp-service-container
   
   # Check if port is available
   lsof -i :8000
   ```

2. **LLM features not working**:
   ```bash
   # Verify OpenAI API key
   echo $OPENAI_API_KEY
   
   # Check service logs for errors
   docker logs nlp-service-container
   ```

3. **Memory issues**:
   ```bash
   # Increase Docker memory limit
   docker run -m 4g -p 8000:8000 nlp-service
   ```

### Performance Tuning

- **Batch processing**: Use `/batch-extract-graph` for multiple documents
- **Caching**: The service caches spaCy models and embeddings
- **Resource limits**: Adjust Docker memory and CPU limits as needed

## API Documentation

Once the service is running, visit:
- **Interactive docs**: http://localhost:8000/docs
- **OpenAPI spec**: http://localhost:8000/openapi.json

## Support

For issues and questions:
1. Check the logs: `docker logs nlp-service-container`
2. Review the API documentation
3. Test with the provided examples
4. Check the main documentation in `API_DOCUMENTATION.md` 