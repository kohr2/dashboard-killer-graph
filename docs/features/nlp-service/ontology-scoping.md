# Ontology Scoping

## Overview

Specify which ontology to use for entity and relationship extraction to improve accuracy and reduce noise.

## Benefits

- **Improved Accuracy**: Focus on domain-specific patterns
- **Reduced Noise**: Fewer irrelevant entities extracted
- **Better Performance**: Smaller scope for faster processing
- **Domain-Specific Results**: Tailored to business domains

## Available Ontologies

### Financial (`financial`)
**Use Case**: Investment reports, earnings calls, company announcements

**Entities**: `COMPANY_NAME`, `PERSON_NAME`, `MONETARY_AMOUNT`, `FINANCIAL_INSTRUMENT`, `INDUSTRY`
**Relationships**: `WORKS_FOR`, `INVESTS`, `OWNS`, `REPORTS_TO`, `PART_OF`

```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.", "ontology_name": "financial"}'
```

### Procurement (`procurement`)
**Use Case**: Contracts, tenders, RFPs, supplier information

**Entities**: `COMPANY_NAME`, `CONTRACT`, `MONETARY_AMOUNT`, `DATE`, `SUPPLIER`
**Relationships**: `AWARDED_TO`, `CONTRACTED_BY`, `SUPPLIER_OF`, `BIDS_ON`, `EXPIRES_ON`

```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Contract CT-2024-001 awarded to Microsoft Corp. for $50 million.", "ontology_name": "procurement"}'
```

### CRM (`crm`)
**Use Case**: Customer communications, leads, sales opportunities

**Entities**: `PERSON_NAME`, `COMPANY_NAME`, `OPPORTUNITY`, `CONTACT_INFO`, `LEAD_STATUS`
**Relationships**: `WORKS_AT`, `LEADS`, `CONTACTS`, `MANAGES`, `QUALIFIED_AS`

```bash
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Lead qualified: John Smith from ABC Corp interested in $100K deal.", "ontology_name": "crm"}'
```

### Default (`default`)
**Use Case**: General purpose extraction

**Entities**: All spaCy entities (PERSON, ORG, GPE, MONEY, DATE, etc.)
**Relationships**: Generic relationships based on context

## API Usage

### Get Available Ontologies

```bash
curl -X GET http://localhost:8000/ontologies
```

### Extract with Specific Ontology

All endpoints support `ontology_name` parameter:

```bash
# Extract entities
curl -X POST http://localhost:8000/extract-entities \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here", "ontology_name": "financial"}'

# Extract graph
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here", "ontology_name": "procurement"}'

# Batch extraction
curl -X POST http://localhost:8000/batch-extract-graph \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Text 1", "Text 2"], "ontology_name": "crm"}'
```

## Python Client

```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Extract with specific ontology
financial_graph = client.extract_graph("Apple Inc. CEO Tim Cook announced a $2 billion investment.", ontology_name="financial")
procurement_graph = client.extract_graph("Contract awarded to Microsoft Corp. for $50 million.", ontology_name="procurement")

# Get available ontologies
ontologies = client.get_available_ontologies()
print(f"Available: {ontologies['available_ontologies']}")
```

## Integration

### Email Processing

Automatically select ontology based on content:

```typescript
const selectOntology = (emailContent: string): string => {
  const content = emailContent.toLowerCase();
  
  if (content.includes('contract') || content.includes('tender')) return 'procurement';
  if (content.includes('investment') || content.includes('financial')) return 'financial';
  if (content.includes('lead') || content.includes('opportunity')) return 'crm';
  
  return 'default';
};
```

### Content Analysis

```python
def analyze_content_for_ontology(text: str) -> str:
    text_lower = text.lower()
    
    financial_keywords = ['investment', 'earnings', 'financial', 'quarterly', 'revenue']
    if any(keyword in text_lower for keyword in financial_keywords):
        return 'financial'
    
    procurement_keywords = ['contract', 'tender', 'rfp', 'supplier', 'vendor']
    if any(keyword in text_lower for keyword in procurement_keywords):
        return 'procurement'
    
    crm_keywords = ['lead', 'opportunity', 'customer', 'prospect', 'deal']
    if any(keyword in text_lower for keyword in crm_keywords):
        return 'crm'
    
    return 'default'
```

## Best Practices

1. **Choose Right Ontology**: Match content type to ontology
2. **Batch by Ontology**: Group documents by ontology for performance
3. **Error Handling**: Fallback to default ontology if not found
4. **Cache Configurations**: Cache ontology details to avoid repeated API calls

## Error Handling

```python
try:
    result = client.extract_graph(text, ontology_name="custom_ontology")
except Exception as e:
    if "not found" in str(e):
        result = client.extract_graph(text, ontology_name="default")
    else:
        raise
``` 