# Enhanced Entity Extraction

## Overview

The enhanced entity extraction system uses ontology-driven configuration to provide advanced entity recognition capabilities. It combines multiple ML models, regex patterns, and enrichment services to extract and enhance entities from various document types.

## Architecture

### Core Components

1. **EnhancedEntityExtractionService** - Main service that orchestrates entity extraction
2. **Ontology Configuration** - Entity extraction rules defined in ontology plugins
3. **ML Model Integration** - External services for advanced entity recognition
4. **Pattern Matching** - Regex-based entity extraction
5. **Entity Enrichment** - External data enrichment services

### Configuration Structure

The entity extraction configuration is defined in ontology plugins:

```json
{
  "entityExtraction": {
    "models": {
      "financial": {
        "type": "finbert",
        "model": "financial-entity-recognition",
        "endpoint": "/extract-financial",
        "confidence": 0.7,
        "priority": 1
      },
      "organizations": {
        "type": "spacy",
        "model": "en_core_web_lg",
        "endpoint": "/extract-orgs",
        "confidence": 0.8,
        "priority": 2
      }
    },
    "patterns": {
      "MonetaryAmount": {
        "regex": "\\$[\\d,]+(?:\\.\\d{2})?",
        "confidence": 0.9,
        "priority": 1
      },
      "Percentage": {
        "regex": "\\d+(?:\\.\\d+)?%",
        "confidence": 0.8,
        "priority": 2
      }
    },
    "contextRules": {
      "financial-report": {
        "priority": ["MonetaryAmount", "Organization", "Date", "Percentage"],
        "requiredModels": ["financial", "organizations"],
        "confidenceThreshold": 0.7
      }
    },
    "enrichment": {
      "Organization": {
        "services": ["edgar", "openCorporates"],
        "properties": ["industry", "sector", "employees", "revenue"]
      }
    }
  }
}
```

## Usage

### Basic Entity Extraction

```typescript
import { EnhancedEntityExtractionService } from '@platform/processing/enhanced-entity-extraction.service';

const service = new EnhancedEntityExtractionService();

// Extract entities from text with context
const entities = await service.extractEntities(
  'Apple Inc. reported $89.5B revenue, up 8.1% YoY.',
  'financial-report'
);
```

### Context-Aware Extraction

The system automatically determines the appropriate extraction strategy based on:

- **Document Type**: Financial reports, emails, contracts
- **Content Analysis**: Keywords, patterns, structure
- **Domain Context**: Financial, CRM, procurement

### Entity Enrichment

Extracted entities are automatically enriched with external data:

```typescript
// Organization entity gets enriched with:
{
  name: 'Apple Inc.',
  type: 'Organization',
  confidence: 0.85,
  properties: {
    industry: 'Technology',
    sector: 'Consumer Electronics',
    employees: 164000,
    revenue: 394328000000,
    ticker: 'AAPL'
  }
}
```

## Financial Domain Example

### Financial Plugin Configuration

The financial ontology plugin includes specialized entity extraction:

```typescript
// src/ontologies/financial/financial.plugin.ts
export const financialPlugin: OntologyPlugin = {
  name: 'financial',
  entitySchemas: {
    ...financialOntology.entities,
    Organization: {
      ...financialOntology.entities.Organization,
      entityExtraction: financialEntityExtraction
    }
  }
};
```

### Financial Entity Types

- **MonetaryAmount**: Currency values, financial figures
- **Percentage**: Growth rates, margins, ratios
- **StockSymbol**: Ticker symbols, company codes
- **Currency**: Currency codes and denominations
- **Organization**: Companies, institutions
- **Person**: Executives, analysts, stakeholders

### Context Rules

Different contexts prioritize different entity types:

- **financial-report**: Focus on monetary amounts, organizations, dates
- **earnings-call**: Prioritize people, organizations, financial metrics
- **investment-memo**: Emphasize stock symbols, financial projections

## Integration with Attachment Processing

The enhanced entity extraction is integrated into the attachment processing pipeline:

```typescript
// src/platform/processing/attachment-processing.service.ts
private async extractEntitiesFromText(text: string, source: string): Promise<ExtractedEntity[]> {
  const context = this.determineContext(source, text);
  return await this.enhancedEntityExtraction.extractEntities(text, context);
}

private determineContext(filename: string, text: string): string {
  // Analyze filename and content to determine context
  if (filename.includes('financial') || text.includes('revenue')) {
    return 'financial-report';
  }
  return 'email';
}
```

## ML Model Integration

### Supported Model Types

1. **spacy**: General NLP models for organizations, people, locations
2. **finbert**: Financial domain-specific entity recognition
3. **local**: Custom models for specific use cases

### Model Configuration

```typescript
{
  "type": "finbert",
  "model": "financial-entity-recognition",
  "endpoint": "/extract-financial",
  "confidence": 0.7,
  "priority": 1
}
```

## Enrichment Services

### Available Services

- **EDGAR**: SEC filing data for US companies
- **OpenCorporates**: Global company information
- **LinkedIn**: Professional profiles and company data
- **Yahoo Finance**: Stock market data
- **Currency Converter**: Exchange rates and inflation adjustment

### Service Configuration

```typescript
{
  "services": ["edgar", "openCorporates"],
  "properties": ["industry", "sector", "employees", "revenue"]
}
```

## Benefits

1. **Domain-Specific**: Tailored extraction for different business domains
2. **Configurable**: Easy to modify extraction rules via ontology
3. **Enriched**: Automatic data enhancement from external sources
4. **Context-Aware**: Intelligent extraction based on document type
5. **Extensible**: Easy to add new models and enrichment services

## Future Enhancements

1. **Continuous Learning**: Model improvement based on user feedback
2. **Multilingual Support**: Entity extraction in multiple languages
3. **Relational Extraction**: Understanding relationships between entities
4. **Custom Models**: Domain-specific model training capabilities
5. **Real-time Enrichment**: Live data updates from external sources 