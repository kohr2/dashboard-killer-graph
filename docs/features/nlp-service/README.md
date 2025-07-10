# NLP Service Documentation

## Overview

FastAPI microservice for entity extraction, knowledge graph generation, and embedding creation with ontology scoping support.

## Key Features

- **Ontology Scoping**: Multi-ontology support (financial, procurement, CRM) for domain-specific extraction
- **Entity Extraction**: spaCy-based entity recognition with LLM refinement
- **Knowledge Graph Generation**: LLM-powered graph extraction with relationships
- **Batch Processing**: Concurrent processing for multiple documents
- **Embedding Generation**: Sentence transformers for vector embeddings
- **Production Ready**: Docker with Nginx reverse proxy and SSL

## Quick Start

```bash
# Deploy
chmod +x scripts/deploy-nlp-service.sh
./scripts/deploy-nlp-service.sh

# Test
curl http://localhost:8000/health
curl -X GET http://localhost:8000/ontologies
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.", "ontology_name": "financial"}'
```

## Available Ontologies

| Ontology | Use Case | Key Entities | Key Relationships |
|----------|----------|--------------|-------------------|
| `financial` | Investment reports, earnings calls | COMPANY_NAME, PERSON_NAME, MONETARY_AMOUNT | WORKS_FOR, INVESTS, OWNS |
| `procurement` | Contracts, tenders, RFPs | COMPANY_NAME, CONTRACT, MONETARY_AMOUNT | AWARDED_TO, CONTRACTED_BY |
| `crm` | Customer communications, leads | PERSON_NAME, COMPANY_NAME, OPPORTUNITY | WORKS_AT, LEADS, CONTACTS |
| `default` | General purpose | All spaCy entities | Generic relationships |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health |
| `/ontologies` | GET | Available ontologies |
| `/extract-entities` | POST | Entity extraction |
| `/extract-graph` | POST | Knowledge graph extraction |
| `/batch-extract-graph` | POST | Batch processing |
| `/embed` | POST | Embedding generation |

## Python Client

```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")
graph = client.extract_graph("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
ontologies = client.get_available_ontologies()
```

## Documentation

- **[Quick Start](quick-start.md)** - Deployment and basic usage
- **[API Reference](api-reference.md)** - Complete API documentation
- **[Ontology Scoping](ontology-scoping.md)** - Multi-ontology usage guide
- **[Python Client](python-client.md)** - Client SDK documentation 