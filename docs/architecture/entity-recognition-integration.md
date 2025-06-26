# Unified Entity Recognition and Integration

## Overview

This document explains how the system performs entity recognition by combining the ontologies from all active extensions into a single, unified model. This approach allows for rich, cross-domain entity extraction in a single pass.

## Architecture Flow

The system uses a streamlined, ontology-driven process:

```
📧 Input Content (Email/Document)
    │
    ├─ 1. Collect Ontologies from All Extensions (CRM, Financial, etc.)
    │
    ↓
🧠 Unified NLP Extraction
    │  (LLM constrained by the combined ontology)
    │
    ├─ 2. Extract All Entities & Relationships in a Single Pass
    │
    ↓
🔗 Entity Resolution & Graph Population
    │
    ├─ 3. Resolve Entities via Vector Search
    ├─ 4. Create Nodes with Multi-Labeling (e.g., :Investor:Organization)
    ├─ 5. Create Relationships
    │
    ↓
💡 Intelligence Generation & Application Integration
```

## 1. Unified, Ontology-Driven Extraction

The core principle is that there is **no separate extraction step** for different domains. Instead, the system leverages its extension architecture to build a comprehensive model on the fly.

1.  **Ontology Aggregation**: At startup, the platform's `OntologyService` scans all active extensions and aggregates their `ontology.json` files. This creates a complete list of all known entity and relationship types across all business domains.

2.  **Dynamic NLP Constraining**: This aggregated list of types is sent to the Python NLP service. The Large Language Model (LLM) is then instructed to **only** extract entities and relationships that conform to this dynamically generated schema.

This ensures that all extracted data is valid and directly mappable to the knowledge graph.

### Example of Unified Extraction

Given an input text, the NLP service, using the combined ontology, can extract entities from multiple domains simultaneously:

```typescript
// Sample entities extracted in a single pass
const extractedGraph = {
  entities: [
    // CRM Domain Entities
    { type: 'Person', value: 'Robert Johnson', confidence: 0.95 },
    { type: 'Organization', value: 'Morgan Stanley', confidence: 0.92 },
    // Financial Domain Entities
    { 
      type: 'FinancialInstrument', 
      value: 'Goldman Sachs Group Inc. (NYSE: GS)',
      confidence: 0.94,
      properties: {
        instrumentType: 'EQUITY',
        exchange: 'NYSE',
        ticker: 'GS'
      }
    },
    {
      type: 'RegulatoryIdentifier',
      value: 'CUSIP: 912828XG0',
      confidence: 0.97,
      properties: {
        idType: 'CUSIP',
        identifier: '912828XG0'
      }
    }
  ],
  relationships: [
    {
      type: 'WORKS_FOR',
      source: 'Robert Johnson',
      target: 'Morgan Stanley',
      confidence: 0.85
    }
  ]
};
```

## 2. Integration via Multi-Labeling and Bridges

As described in the main `overview.md`, the system uses multi-labeling and Ontology Bridges to create a unified graph. An entity like "Morgan Stanley" can be both an `Organization` (from the CRM ontology) and a `FinancialInstitution` (from the Financial ontology), resulting in a node with both labels: `(:FinancialInstitution:Organization)`.

## 3. Real-World Example

### Input: Investment Advisory Email
```text
Dear Mr. Johnson,

Following our discussion, I've prepared recommendations for your portfolio:
1. Goldman Sachs Group Inc. (NYSE: GS) - A solid equity choice.
2. A 10-year Treasury Bond with CUSIP: 912828XG0.

Your current portfolio value is $2.5 million.

Best regards,
Sarah Chen, CFA
Morgan Stanley Investment Management
```

### Unified Processing Results

The system processes the email in a single call to the NLP service.

#### Extracted Graph
- **Entities**:
  - `Person`: "Mr. Johnson"
  - `Person`: "Sarah Chen"
  - `Organization`: "Morgan Stanley Investment Management"
  - `FinancialInstrument`: "Goldman Sachs Group Inc. (NYSE: GS)"
  - `RegulatoryIdentifier`: "CUSIP: 912828XG0"
  - `MonetaryAmount`: "$2.5 million"
- **Relationships**:
  - (`Sarah Chen`)-[:WORKS_FOR]->(`Morgan Stanley Investment Management`)

#### Neo4j Ingestion
- A `:Communication` node is created for the email.
- Nodes for each entity are created or resolved using vector search.
- The "Morgan Stanley" node might be created with labels `:FinancialInstitution:Organization` via an Ontology Bridge.
- All entities are linked to the `:Communication` node.
- The `[:WORKS_FOR]` relationship is created between the "Sarah Chen" and "Morgan Stanley" nodes.
```

This unified, ontology-driven approach is what allows the system to be both highly extensible and capable of rich, cross-domain analysis from a single, coherent knowledge graph.

## 4. Intelligence Generation

### Financial Insights
```typescript
const insights = {
  portfolioAnalysis: {
    totalValue: 2500000,
    instruments: [/*FIBO entities*/],
    riskProfile: { score: 0.65, category: 'MEDIUM' },
    diversification: {
      byType: { 'EQUITY': 3, 'BOND': 1 },
      byCurrency: { 'USD': 3, 'EUR': 1 }
    }
  },
  clientProfile: {
    riskAssessment: 'Moderate',
    investmentPreferences: ['Equity investments', 'Fixed income'],
    complianceStatus: 'Compliant',
    relationshipValue: 2500000
  },
  recommendations: [
    'Consider risk mitigation strategies',
    'Review portfolio diversification'
  ]
};
```

### Application Integration
```typescript
// Contact updates with financial profile
const contactUpdate = {
  contactId: 'contact_johnson_001',
  financialProfile: {
    portfolioValue: 2500000,
    riskProfile: 0.65,
    clientSegment: 'CORPORATE',
    complianceStatus: 'Compliant',
    lastFinancialUpdate: '2024-03-15T10:30:00Z'
  }
};

// Activities created
const activities = [
  {
    type: 'DATA_ANALYSIS',
    description: 'Financial entity analysis completed',
    metadata: {
      entityTypes: ['FIBO_SECURITY', 'FIBO_CURRENCY'],
      portfolioValue: 2500000,
      riskScore: 0.65
    }
  }
];
```

## 5. Extension Framework

### Adding New Extensions
```typescript
// Healthcare extension example
const healthcareExtension = {
  extensionName: 'healthcare',
  entityTypes: [
    {
      type: 'MEDICAL_CONDITION',
      category: 'HEALTHCARE',
      patterns: [/\b(?:diabetes|hypertension|covid-19)\b/gi],
      contextKeywords: ['diagnosis', 'condition', 'treatment']
    }
  ],
  ontologyMapping: {
    'MEDICAL_CONDITION': 'CustomerKnowledge'
  }
};
```

### Extension Registration
```typescript
// Register extensions with the core system
entityExtractor.registerExtension(financialExtension);
entityExtractor.registerExtension(healthcareExtension);
entityExtractor.registerExtension(legalExtension);
```

## 6. Benefits of This Architecture

### ✅ **Extensibility**
- New domains easily added (healthcare, legal, real estate)
- Domain-specific patterns and ontologies
- Modular extension framework

### ✅ **Semantic Understanding**
- DOLCE foundational ontology provides semantic grounding
- O-CREAM-v2 ensures CRM-relevant categorization
- FIBO compliance for financial regulations

### ✅ **Context Awareness**
- spaCy provides linguistic context understanding
- Business context influences entity interpretation
- Cross-domain relationship inference

### ✅ **Intelligence Generation**
- Automated insights from entity patterns
- Risk assessment and compliance monitoring
- Personalized recommendations

### ✅ **Regulatory Compliance**
- FIBO-compliant financial entities
- Automatic compliance checking
- Audit trail through ontology

## 7. Usage Examples

### Basic Usage
```typescript
const service = new FinancialEntityIntegrationService(contactRepository);

const result = await service.processFinancialContent(emailContent, {
  contactId: 'contact_001',
  businessContext: 'ADVISORY',
  clientSegment: 'CORPORATE'
});

console.log(`Extracted ${result.fiboEntities.length} FIBO entities`);
console.log(`Portfolio value: $${result.insights.portfolioAnalysis.totalValue}`);
```

### Extension Development
```typescript
// Create new extension
const realEstateExtension = {
  extensionName: 'real-estate',
  entityTypes: [
    {
      type: 'PROPERTY_ADDRESS',
      category: 'REAL_ESTATE',
      patterns: [/\d+\s+\w+\s+(?:Street|Ave|Road|Drive)/gi]
    }
  ],
  customExtractors: [
    {
      name: 'property_valuation_extractor',
      extract: async (text) => extractPropertyValues(text)
    }
  ]
};
```

## Conclusion

This architecture provides a **scalable, semantic, and compliant** approach to entity recognition that:

1. **Leverages spaCy's superior NLP capabilities** over regex patterns
2. **Integrates domain-specific ontologies** (FIBO for finance)
3. **Maintains semantic consistency** through O-CREAM-v2
4. **Generates actionable business intelligence**
5. **Supports regulatory compliance** requirements
6. **Enables extensible domain coverage**

The result is a **comprehensive CRM platform** that understands not just what entities exist in content, but what they mean in business context and how they relate to each other across different domains.
