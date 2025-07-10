# MCP Server NLP Tool

## Overview

NLP tool for MCP server that integrates with Python NLP service for text processing, entity extraction, and knowledge graph generation.

## Features

- Entity extraction (spaCy + LLM refinement)
- Knowledge graph generation
- Batch processing
- Embedding generation
- Ontology scoping (financial, procurement, CRM, default)

## API

**GET** `/tools` - List available tools  
**POST** `/nlp` - Process text with NLP

### Operations
- `extract_entities` - Extract named entities
- `refine_entities` - Extract and refine with LLM
- `extract_graph` - Generate knowledge graph
- `batch_extract_graph` - Process multiple texts
- `generate_embeddings` - Create vector embeddings

## Usage

```bash
# Extract entities
curl -X POST http://localhost:3002/nlp \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "extract_entities",
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'

# Extract knowledge graph
curl -X POST http://localhost:3002/nlp \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "extract_graph",
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'
```

## Configuration

| Variable | Default |
|----------|---------|
| `NLP_SERVICE_URL` | `http://localhost:8000` |
| `MCP_HTTP_PORT` | `3002` |

## Error Handling

- Graceful service unavailability handling
- Input validation with clear error messages
- Retry logic with exponential backoff
- MCP protocol compliance 