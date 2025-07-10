# Python Client SDK

## Overview

Python client for NLP Service API with ontology scoping support.

## Installation

```bash
cp python-services/nlp-service/client.py your-project/
pip install requests
```

## Basic Usage

```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Health check
health = client.health_check()
print(f"Status: {health.status}")

# Get ontologies
ontologies = client.get_available_ontologies()
print(f"Available: {ontologies.available_ontologies}")
```

## Entity Extraction

```python
# Extract entities
entities = client.extract_entities("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
for entity in entities:
    print(f"{entity.value} ({entity.type}) - {entity.confidence}")

# Refine entities
refined = client.refine_entities("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
print(f"Raw: {len(refined.raw_entities)}, Refined: {len(refined.refined_entities)}")
```

## Knowledge Graph Extraction

```python
# Extract graph
graph = client.extract_graph("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
print(f"Entities: {len(graph.entities)}, Relationships: {len(graph.relationships)}")

# Access entities
for entity in graph.entities:
    print(f"Entity: {entity.value} ({entity.type})")
    if entity.properties:
        print(f"  Properties: {entity.properties}")

# Access relationships
for rel in graph.relationships:
    print(f"Relationship: {rel.source} --[{rel.type}]--> {rel.target}")
```

## Batch Processing

```python
texts = [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Microsoft Corp. reported quarterly earnings of $50 billion.",
    "Google's Sundar Pichai discussed AI strategy."
]

# Batch extract
graphs = client.batch_extract_graph(texts, ontology_name="financial")
for i, graph in enumerate(graphs):
    print(f"Doc {i+1}: {len(graph.entities)} entities, {len(graph.relationships)} relationships")
```

## Embedding Generation

```python
texts = ["Apple Inc. CEO Tim Cook", "Microsoft Corp. quarterly earnings"]
embedding_result = client.generate_embeddings(texts)
print(f"Generated {len(embedding_result.embeddings)} embeddings")
print(f"Model: {embedding_result.model}, Dimension: {embedding_result.dimension}")
```

## Ontology Management

```python
# Update ontology
client.update_ontology(
    entity_types=["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
    relationship_types=["WORKS_FOR", "INVESTS", "OWNS"],
    compact_ontology={
        "e": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
        "r": [["PERSON_NAME", "WORKS_FOR", "COMPANY_NAME"]]
    },
    ontology_name="custom"
)

# Use custom ontology
custom_graph = client.extract_graph("test text", ontology_name="custom")
```

## Error Handling

```python
from client import NLPServiceError, OntologyNotFoundError

try:
    result = client.extract_graph("test text", ontology_name="unknown_ontology")
except OntologyNotFoundError:
    result = client.extract_graph("test text", ontology_name="default")
except NLPServiceError as e:
    print(f"Service error: {e}")
```

## Advanced Usage

### Custom Configuration

```python
client = NLPServiceClient(
    base_url="http://localhost:8000",
    timeout=60,
    headers={"User-Agent": "MyApp/1.0"}
)
```

### Async Usage

```python
import asyncio
import aiohttp
from client import AsyncNLPServiceClient

async def process_async():
    async with aiohttp.ClientSession() as session:
        client = AsyncNLPServiceClient("http://localhost:8000", session=session)
        texts = ["Text 1", "Text 2", "Text 3"]
        tasks = [client.extract_graph(text, ontology_name="financial") for text in texts]
        results = await asyncio.gather(*tasks)
        return results
```

### Caching

```python
import hashlib
from functools import lru_cache

class CachedNLPServiceClient:
    def __init__(self, base_url):
        self.client = NLPServiceClient(base_url)
    
    @lru_cache(maxsize=1000)
    def _get_cache_key(self, text, ontology_name):
        content = f"{text}:{ontology_name}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def extract_graph(self, text, ontology_name="default"):
        cache_key = self._get_cache_key(text, ontology_name)
        # Implement your cache here
        return self.client.extract_graph(text, ontology_name=ontology_name)
```

## Data Models

### Entity
```python
class Entity:
    type: str           # Entity type
    value: str          # Entity text
    confidence: float   # Confidence score
    start: int          # Start position (optional)
    end: int            # End position (optional)
    properties: dict    # Additional properties (optional)
```

### Relationship
```python
class Relationship:
    source: str         # Source entity
    target: str         # Target entity
    type: str           # Relationship type
    confidence: float   # Confidence score
    properties: dict    # Additional properties (optional)
```

### Graph Result
```python
class GraphResult:
    entities: List[Entity]           # List of entities
    relationships: List[Relationship] # List of relationships
    refinement_info: str             # Refinement information
    embedding: List[float]           # Document embedding
    ontology_used: str               # Ontology used
```

## Best Practices

1. **Error Handling**: Always handle ontology not found errors
2. **Batch Processing**: Use batch endpoints for multiple documents
3. **Ontology Selection**: Choose appropriate ontology for content type
4. **Caching**: Cache results when appropriate
5. **Health Checks**: Monitor service health before making requests 