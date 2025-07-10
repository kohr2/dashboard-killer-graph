# NLP Service API Documentation

## Overview

The NLP Service is a FastAPI-based microservice that provides advanced natural language processing capabilities including entity extraction, graph extraction, and embedding generation. It's designed to be ontology-agnostic and can handle multiple data sources and formats.

**New Feature**: The service now supports ontology scoping, allowing you to specify which ontology to use for extraction, reducing the scope and improving accuracy.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com` (with SSL)

## Authentication

Currently, the service runs without authentication. For production deployments, consider implementing API key authentication or OAuth2.

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. Get Available Ontologies

**GET** `/ontologies`

Get list of available ontologies and their configurations.

**Response:**
```json
{
  "available_ontologies": ["financial", "procurement", "crm", "default"],
  "default_ontology": "default",
  "ontology_details": {
    "financial": {
      "entity_types": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
      "relationship_types": ["WORKS_FOR", "INVESTS", "OWNS"],
      "property_types": ["AMOUNT", "DATE"],
      "entity_count": 3,
      "relationship_count": 3
    }
  }
}
```

### 3. Extract Entities (Raw spaCy)

**POST** `/extract-entities`

Extract named entities from text using spaCy without LLM refinement.

**Request:**
```json
{
  "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy.",
  "ontology_name": "financial"
}
```

**Response:**
```json
[
  {
    "type": "COMPANY_NAME",
    "value": "Apple Inc.",
    "confidence": 0.85,
    "start": 0,
    "end": 9,
    "spacy_label": "ORG",
    "context": "Apple Inc. CEO Tim Cook announced"
  },
  {
    "type": "PERSON_NAME",
    "value": "Tim Cook",
    "confidence": 0.85,
    "start": 13,
    "end": 21,
    "spacy_label": "PERSON",
    "context": "Apple Inc. CEO Tim Cook announced"
  },
  {
    "type": "MONETARY_AMOUNT",
    "value": "$2 billion",
    "confidence": 0.85,
    "start": 35,
    "end": 45,
    "spacy_label": "MONEY",
    "context": "announced a $2 billion investment"
  }
]
```

### 4. Extract and Refine Entities

**POST** `/refine-entities`

Extract entities with spaCy and refine them using LLM.

**Request:**
```json
{
  "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy.",
  "ontology_name": "financial"
}
```

**Response:**
```json
{
  "raw_entities": [...],
  "refined_entities": [...],
  "refinement_info": "Entities refined by LLM.",
  "ontology_used": "financial"
}
```

### 5. Extract Knowledge Graph

**POST** `/extract-graph`

Extract entities and relationships to build a knowledge graph using LLM.

**Request:**
```json
{
  "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy projects.",
  "ontology_name": "financial"
}
```

**Response:**
```json
{
  "entities": [
    {
      "type": "COMPANY_NAME",
      "value": "Apple Inc.",
      "confidence": 0.9,
      "properties": {}
    },
    {
      "type": "PERSON_NAME",
      "value": "Tim Cook",
      "confidence": 0.9,
      "properties": {}
    },
    {
      "type": "MONETARY_AMOUNT",
      "value": "$2 billion",
      "confidence": 0.9,
      "properties": {}
    }
  ],
  "relationships": [
    {
      "source": "Tim Cook",
      "target": "Apple Inc.",
      "type": "WORKS_FOR",
      "confidence": 0.9
    },
    {
      "source": "Apple Inc.",
      "target": "$2 billion",
      "type": "INVESTS",
      "confidence": 0.9
    }
  ],
  "refinement_info": "Graph generated directly by LLM based on dynamic ontology.",
  "embedding": [0.1, 0.2, 0.3, ...],
  "ontology_used": "financial"
}
```

### 6. Batch Extract Graphs

**POST** `/batch-extract-graph`

Process multiple texts in a single request for better performance.

**Request:**
```json
{
  "texts": [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion.",
    "Google's Sundar Pichai discussed AI strategy."
  ],
  "ontology_name": "financial"
}
```

**Response:**
```json
[
  {
    "entities": [...],
    "relationships": [...],
    "refinement_info": "...",
    "embedding": [...],
    "ontology_used": "financial"
  },
  {
    "entities": [...],
    "relationships": [...],
    "refinement_info": "...",
    "embedding": [...],
    "ontology_used": "financial"
  },
  {
    "entities": [...],
    "relationships": [...],
    "refinement_info": "...",
    "embedding": [...],
    "ontology_used": "financial"
  }
]
```

### 7. Generate Embeddings

**POST** `/embed`

Generate sentence embeddings for a list of texts.

**Request:**
```json
{
  "texts": [
    "Apple Inc. CEO Tim Cook",
    "Microsoft Corp. quarterly earnings",
    "Google AI strategy"
  ]
}
```

**Response:**
```json
{
  "embeddings": [
    [0.1, 0.2, 0.3, ...],
    [0.4, 0.5, 0.6, ...],
    [0.7, 0.8, 0.9, ...]
  ]
}
```

### 8. Update Ontology

**POST** `/ontologies`

Update the ontology schema that constrains entity and relationship extraction.

**Request:**
```json
{
  "entity_types": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
  "relationship_types": ["WORKS_FOR", "INVESTS", "OWNS"],
  "property_types": ["AMOUNT", "DATE"],
  "entity_descriptions": {
    "COMPANY_NAME": "Business organizations and corporations",
    "PERSON_NAME": "Individual people"
  },
  "relationship_descriptions": {
    "WORKS_FOR": "Employment relationship between person and company"
  },
  "compact_ontology": {
    "e": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
    "r": [
      ["PERSON_NAME", "WORKS_FOR", "COMPANY_NAME"],
      ["COMPANY_NAME", "INVESTS", "MONETARY_AMOUNT"]
    ]
  },
  "ontology_name": "financial"
}
```

**Response:** 204 No Content

## Ontology Scoping

The service now supports ontology scoping to reduce the extraction scope and improve accuracy:

### Benefits of Ontology Scoping

1. **Improved Accuracy**: By limiting extraction to specific entity and relationship types, the LLM can focus on relevant patterns
2. **Reduced Noise**: Fewer irrelevant entities and relationships are extracted
3. **Domain-Specific Results**: Results are tailored to the specific domain (financial, procurement, CRM, etc.)
4. **Better Performance**: Smaller ontology scope can lead to faster processing

### Available Ontologies

Common ontology names include:
- `financial` - Financial instruments, companies, investments
- `procurement` - Contracts, tenders, suppliers
- `crm` - Customers, leads, opportunities
- `default` - General purpose (fallback)

### Using Ontology Scoping

**With Python Client:**
```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Extract with financial ontology
financial_graph = client.extract_graph(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)

# Extract with procurement ontology
procurement_graph = client.extract_graph(
    "Contract awarded to Microsoft Corp. for $50 million.",
    ontology_name="procurement"
)

# Get available ontologies
ontologies = client.get_available_ontologies()
print(f"Available: {ontologies['available_ontologies']}")
```

**With cURL:**
```bash
# Extract with financial ontology
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'

# Get available ontologies
curl -X GET http://localhost:8000/ontologies
```

## Error Handling

The API returns standard HTTP status codes:

- **200**: Success
- **400**: Bad Request (invalid input)
- **404**: Not Found
- **500**: Internal Server Error
- **503**: Service Unavailable (OpenAI not configured)

Error responses include a detail message:

```json
{
  "detail": "OpenAI API key not configured"
}
```

## Rate Limits

- **General API**: 10 requests/second
- **Extraction endpoints**: 5 requests/second
- **Batch extraction**: 3 requests/second

## Timeouts

- **Entity extraction**: 30 seconds
- **Graph extraction**: 300 seconds
- **Batch extraction**: 600 seconds
- **Embedding generation**: 120 seconds

## Usage Examples

### Python Client

```python
import requests
import json

# Base URL
base_url = "http://localhost:8000"

# Get available ontologies
response = requests.get(f"{base_url}/ontologies")
ontologies = response.json()
print(f"Available ontologies: {ontologies['available_ontologies']}")

# Extract entities with specific ontology
response = requests.post(f"{base_url}/extract-entities", json={
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
})
entities = response.json()

# Extract knowledge graph with specific ontology
response = requests.post(f"{base_url}/extract-graph", json={
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
})
graph = response.json()
print(f"Used ontology: {graph['ontology_used']}")

# Batch processing with ontology scoping
response = requests.post(f"{base_url}/batch-extract-graph", json={
    "texts": [
        "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
        "Microsoft Corp. reported quarterly earnings of $50 billion."
    ],
    "ontology_name": "financial"
})
graphs = response.json()
```

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

const baseUrl = 'http://localhost:8000';

// Get available ontologies
const getOntologies = async () => {
  const response = await axios.get(`${baseUrl}/ontologies`);
  return response.data;
};

// Extract entities with ontology scoping
const extractEntities = async (text, ontologyName) => {
  const response = await axios.post(`${baseUrl}/extract-entities`, {
    text,
    ontology_name: ontologyName
  });
  return response.data;
};

// Extract knowledge graph with ontology scoping
const extractGraph = async (text, ontologyName) => {
  const response = await axios.post(`${baseUrl}/extract-graph`, {
    text,
    ontology_name: ontologyName
  });
  return response.data;
};

// Batch processing with ontology scoping
const batchExtractGraph = async (texts, ontologyName) => {
  const response = await axios.post(`${baseUrl}/batch-extract-graph`, {
    texts,
    ontology_name: ontologyName
  });
  return response.data;
};
```

### cURL Examples

```bash
# Get available ontologies
curl -X GET http://localhost:8000/ontologies

# Extract entities with financial ontology
curl -X POST http://localhost:8000/extract-entities \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'

# Extract knowledge graph with procurement ontology
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Contract awarded to Microsoft Corp. for $50 million.",
    "ontology_name": "procurement"
  }'

# Batch processing with CRM ontology
curl -X POST http://localhost:8000/batch-extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Lead qualified: John Smith from ABC Corp", "Opportunity: $100K deal with XYZ Inc"],
    "ontology_name": "crm"
  }'
```

## Deployment

### Docker

```bash
# Build and run
docker build -t nlp-service .
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key nlp-service

# Using docker-compose
docker-compose up nlp-service
```

### Production Deployment

1. Use the production docker-compose file
2. Set up SSL certificates
3. Configure environment variables
4. Set up monitoring and logging

```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d
```

## Monitoring

- Health check endpoint: `/health`
- Logs are available in container logs
- Consider setting up Prometheus metrics for production

## Security Considerations

1. **API Authentication**: Implement API key or OAuth2 authentication
2. **Rate Limiting**: Already configured in Nginx
3. **Input Validation**: All inputs are validated using Pydantic
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Keep sensitive data in environment variables 