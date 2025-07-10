# NLP Service Quick Start

## Prerequisites

- Docker and Docker Compose
- OpenAI API key (optional, for LLM features)
- 4GB+ RAM

## Deploy

### Option 1: Script (Recommended)

```bash
chmod +x scripts/deploy-nlp-service.sh
./scripts/deploy-nlp-service.sh
```

### Option 2: Manual Docker

```bash
cd python-services/nlp-service
docker build -t nlp-service .
docker run -d -p 8000:8000 -e OPENAI_API_KEY=your_key nlp-service
```

### Option 3: Local Development

```bash
cd python-services/nlp-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Test

```bash
# Health check
curl http://localhost:8000/health

# Get ontologies
curl -X GET http://localhost:8000/ontologies

# Extract with financial ontology
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.", "ontology_name": "financial"}'
```

## Python Client

```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Extract entities
entities = client.extract_entities("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
for entity in entities:
    print(f"{entity.value} ({entity.type})")

# Extract graph
graph = client.extract_graph("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
print(f"Found {len(graph.entities)} entities and {len(graph.relationships)} relationships")

# Batch processing
texts = ["Text 1", "Text 2", "Text 3"]
graphs = client.batch_extract_graph(texts, ontology_name="financial")
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM features | None |
| `LOG_LEVEL` | Logging level | INFO |
| `HOST` | Service host | 0.0.0.0 |
| `PORT` | Service port | 8000 |

## Troubleshooting

**Service not starting:**
```bash
lsof -i :8000
docker logs nlp-service-container
```

**OpenAI errors:**
```bash
echo $OPENAI_API_KEY
curl -X POST http://localhost:8000/extract-graph -H "Content-Type: application/json" -d '{"text": "test", "ontology_name": "default"}'
``` 