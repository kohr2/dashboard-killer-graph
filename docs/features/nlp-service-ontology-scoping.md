# NLP Service Ontology Scoping

## Overview

The NLP Service now supports **ontology scoping**, a powerful feature that allows you to specify which ontology to use for entity and relationship extraction. This improves accuracy, reduces noise, and provides domain-specific results.

## Key Benefits

### 1. Improved Accuracy
By limiting extraction to specific entity and relationship types, the LLM can focus on relevant patterns for the domain, leading to more accurate results.

### 2. Reduced Noise
Fewer irrelevant entities and relationships are extracted, resulting in cleaner knowledge graphs and better data quality.

### 3. Domain-Specific Results
Results are tailored to the specific business domain (financial, procurement, CRM, etc.), making them more relevant and actionable.

### 4. Better Performance
Smaller ontology scope can lead to faster processing times and reduced computational overhead.

## Available Ontologies

### Financial Ontology (`financial`)
**Best for**: Financial documents, investment reports, company announcements
**Entity Types**: Companies, people, monetary amounts, financial instruments
**Relationship Types**: Works for, invests, owns, reports to

**Example Use Case**:
```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy.",
    "ontology_name": "financial"
  }'
```

### Procurement Ontology (`procurement`)
**Best for**: Contract documents, tender notices, supplier information
**Entity Types**: Companies, contracts, monetary amounts, dates
**Relationship Types**: Awarded to, contracted by, supplier of

**Example Use Case**:
```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Contract awarded to Microsoft Corp. for $50 million software development.",
    "ontology_name": "procurement"
  }'
```

### CRM Ontology (`crm`)
**Best for**: Customer communications, lead information, sales opportunities
**Entity Types**: People, companies, opportunities, contact information
**Relationship Types**: Works at, leads, contacts, manages

**Example Use Case**:
```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Lead qualified: John Smith from ABC Corp interested in $100K deal.",
    "ontology_name": "crm"
  }'
```

### Default Ontology (`default`)
**Best for**: General purpose extraction when domain is unknown
**Entity Types**: All standard spaCy entities
**Relationship Types**: Generic relationships

## API Usage

### Get Available Ontologies

```bash
curl -X GET http://localhost:8000/ontologies
```

**Response**:
```json
{
  "available_ontologies": ["financial", "procurement", "crm", "default"],
  "default_ontology": "default",
  "ontology_details": {
    "financial": {
      "entity_types": ["COMPANY_NAME", "PERSON_NAME", "MONETARY_AMOUNT"],
      "relationship_types": ["WORKS_FOR", "INVESTS", "OWNS"],
      "entity_count": 3,
      "relationship_count": 3
    }
  }
}
```

### Extract with Specific Ontology

All extraction endpoints now support the `ontology_name` parameter:

```bash
# Extract entities
curl -X POST http://localhost:8000/extract-entities \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text here",
    "ontology_name": "financial"
  }'

# Extract knowledge graph
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text here",
    "ontology_name": "procurement"
  }'

# Batch extraction
curl -X POST http://localhost:8000/batch-extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Text 1", "Text 2", "Text 3"],
    "ontology_name": "crm"
  }'
```

## Python Client SDK

### Basic Usage

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

### Batch Processing with Ontology Scoping

```python
from client import batch_extract_graph

texts = [
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "Contract awarded to Microsoft Corp. for $50 million.",
    "Lead qualified: John Smith from ABC Corp."
]

# Process with financial ontology
financial_graphs = batch_extract_graph(texts, ontology_name="financial")

# Process with procurement ontology
procurement_graphs = batch_extract_graph(texts, ontology_name="procurement")
```

## Integration with Main Application

The NLP service integrates seamlessly with the main application's entity extraction pipeline:

### Email Processing

When processing emails, the system can automatically select the appropriate ontology based on:

1. **Email Content Analysis**: Keywords and patterns in the email content
2. **Sender Domain**: Company domain analysis
3. **Explicit Configuration**: Manual ontology selection
4. **Default Fallback**: Uses default ontology if no specific match

### Configuration

You can configure ontology selection in your application:

```typescript
// Example: Configure ontology selection based on email content
const selectOntology = (emailContent: string): string => {
  const content = emailContent.toLowerCase();
  
  if (content.includes('contract') || content.includes('tender')) {
    return 'procurement';
  }
  
  if (content.includes('investment') || content.includes('financial')) {
    return 'financial';
  }
  
  if (content.includes('lead') || content.includes('opportunity')) {
    return 'crm';
  }
  
  return 'default';
};
```

## Deployment

### Quick Deployment

```bash
# Deploy with deployment script
chmod +x scripts/deploy-nlp-service.sh
./scripts/deploy-nlp-service.sh

# Deploy with OpenAI API key
OPENAI_API_KEY=your_key ./scripts/deploy-nlp-service.sh

# Deploy production version with SSL
./scripts/deploy-nlp-service.sh production
```

### Docker Deployment

```bash
# Build and run
cd python-services/nlp-service
docker build -t nlp-service .
docker run -d -p 8000:8000 -e OPENAI_API_KEY=your_key nlp-service

# Using docker-compose
docker-compose up -d nlp-service
```

## Monitoring and Health Checks

### Health Check

```bash
curl http://localhost:8000/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "ontologies_loaded": ["financial", "procurement", "crm", "default"]
}
```

### Service Status

The service includes comprehensive monitoring:

- **Health endpoint**: `/health`
- **Ontology status**: `/ontologies`
- **Logging**: Structured logging with different levels
- **Metrics**: Request counts, response times, error rates

## Best Practices

### 1. Choose the Right Ontology
- Use `financial` for investment reports, company announcements
- Use `procurement` for contracts, tenders, supplier documents
- Use `crm` for customer communications, lead information
- Use `default` for general purpose or unknown content

### 2. Batch Processing
- Use batch endpoints for multiple documents
- Group documents by ontology for better performance
- Consider parallel processing for large datasets

### 3. Error Handling
- Always check the response status
- Handle ontology not found errors gracefully
- Implement fallback to default ontology if needed

### 4. Performance Optimization
- Cache ontology configurations
- Use appropriate timeout values
- Monitor service health regularly

## Troubleshooting

### Common Issues

**Ontology Not Found**:
```json
{
  "detail": "Ontology 'unknown_ontology' not found. Available: ['financial', 'procurement', 'crm', 'default']"
}
```

**Service Unavailable**:
```bash
# Check if service is running
curl http://localhost:8000/health

# Restart service
docker restart nlp-service-container
```

**Performance Issues**:
- Check service logs for errors
- Monitor resource usage
- Consider scaling the service

## Future Enhancements

### Planned Features

1. **Dynamic Ontology Loading**: Load ontologies at runtime
2. **Custom Ontology Support**: Upload custom ontology definitions
3. **Ontology Versioning**: Support for multiple ontology versions
4. **Auto-Detection**: Automatic ontology selection based on content
5. **Performance Metrics**: Detailed performance analytics

### Contributing

To add new ontologies or improve existing ones:

1. Define the ontology structure
2. Add entity and relationship types
3. Update the service configuration
4. Add tests and documentation
5. Submit a pull request

## Related Documentation

- [Entity Extraction Guide](../architecture/entity-extraction-guide.md)
- [API Documentation](../../python-services/nlp-service/API_DOCUMENTATION.md)
- [Quick Start Guide](../../python-services/nlp-service/QUICK_START.md)
- [Deployment Script](../../scripts/deploy-nlp-service.sh) 