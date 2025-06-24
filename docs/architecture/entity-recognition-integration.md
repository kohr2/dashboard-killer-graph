# Entity Recognition Integration: Core CRM + Extensions

## Overview

This document explains how entity recognition works across our extensible CRM platform, integrating the **core O-CREAM-v2 ontology** with **domain-specific extensions** like the **Financial (FIBO) extension**.

## Architecture Flow

```
📧 Input Content (Email/Document)
    ↓
🧠 Core Entity Extraction (spaCy + O-CREAM-v2)
    ↓
🏦 Extension-Specific Extraction (FIBO Financial)
    ↓
🔗 Entity Integration & Relationship Mapping
    ↓
📊 Knowledge Graph Population
    ↓
💡 Intelligence Generation & CRM Integration
```

## 1. Core CRM Entity Recognition

### spaCy + O-CREAM-v2 Foundation
- **spaCy NLP Models**: Context-aware entity recognition with 85-95% accuracy
- **O-CREAM-v2 Ontology**: DOLCE-based semantic categorization
- **20+ Entity Types**: PERSON, ORG, MONEY, DATE, LOCATION, etc.
- **Knowledge Elements**: Automatic creation of ontological knowledge

### Core Entity Processing
```typescript
// Core entities extracted by spaCy
const coreEntities = [
  { type: 'PERSON', value: 'Robert Johnson', confidence: 0.95 },
  { type: 'ORG', value: 'Goldman Sachs Group Inc.', confidence: 0.92 },
  { type: 'MONEY', value: '$2.5 million', confidence: 0.98 },
  { type: 'DATE', value: 'March 15th, 2024', confidence: 0.89 }
];

// O-CREAM-v2 ontological categorization
const ontologyMapping = {
  'PERSON' → 'AgentivePhysicalObject' (DOLCE category),
  'ORG' → 'AgentivePhysicalObject' (DOLCE category),
  'MONEY' → 'Abstract' (DOLCE category)
};
```

## 2. Financial Extension (FIBO Integration)

### FIBO-Compliant Entity Types
- **FIBO_SECURITY**: Financial instruments (stocks, bonds, derivatives)
- **FIBO_CURRENCY**: Currency codes and monetary amounts
- **FIBO_FINANCIAL_INSTITUTION**: Banks, investment firms
- **FIBO_FINANCIAL_RATIO**: P/E ratios, ROI, EBITDA metrics
- **FIBO_REGULATORY_ID**: CUSIP, ISIN, LEI identifiers
- **FIBO_MARKET_DATA**: Trading data, prices, volumes

### Financial Entity Processing
```typescript
// Financial entities with specialized patterns
const financialEntities = [
  { 
    type: 'FIBO_SECURITY', 
    value: 'Goldman Sachs Group Inc. (NYSE: GS)',
    confidence: 0.94,
    fiboProperties: {
      instrumentType: 'EQUITY',
      exchange: 'NYSE',
      ticker: 'GS'
    }
  },
  {
    type: 'FIBO_REGULATORY_ID',
    value: 'CUSIP: 912828XG0',
    confidence: 0.97,
    fiboProperties: {
      idType: 'CUSIP',
      identifier: '912828XG0'
    }
  }
];
```

## 3. Cross-Domain Integration

### Entity Relationship Mapping
```typescript
// Relationships between core and financial entities
const relationships = [
  {
    type: 'OWNS_INSTRUMENT',
    source: 'PERSON:Robert Johnson',
    target: 'FIBO_SECURITY:Goldman Sachs Group Inc.',
    confidence: 0.85
  },
  {
    type: 'ISSUED_BY',
    source: 'FIBO_SECURITY:Treasury Bond',
    target: 'ORG:U.S. Treasury',
    confidence: 0.92
  }
];
```

### Knowledge Graph Population
```typescript
// Unified knowledge graph
const knowledgeGraph = {
  entities: [...coreEntities, ...financialEntities],
  relationships: [...coreRelationships, ...financialRelationships],
  knowledgeElements: [
    {
      type: 'BusinessKnowledge',
      category: 'FINANCIAL',
      entities: financialEntities,
      confidence: 0.89
    }
  ]
};
```

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

### CRM Integration
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

## 6. Real-World Example

### Input: Investment Advisory Email
```text
Dear Mr. Johnson,

Following our discussion about your portfolio diversification, I've prepared recommendations:

1. Goldman Sachs Group Inc. (NYSE: GS) - Current price $350.25
2. Treasury Bond CUSIP: 912828XG0 - 10-year maturity, 4.2% yield
3. EUR/USD currency pair - Consider hedging with €500,000 position

Your current portfolio value stands at $2.5 million with a P/E ratio of 18.5.

Best regards,
Sarah Chen, CFA
Morgan Stanley Investment Management
```

### Processing Results

#### Core Entities (spaCy + O-CREAM-v2)
- **PERSON**: "Mr. Johnson" (confidence: 0.95)
- **PERSON**: "Sarah Chen" (confidence: 0.93)
- **ORG**: "Morgan Stanley Investment Management" (confidence: 0.96)
- **MONEY**: "$2.5 million" (confidence: 0.98)
- **DATE**: "10-year maturity" (confidence: 0.87)

#### Financial Entities (FIBO)
- **FIBO_SECURITY**: "Goldman Sachs Group Inc. (NYSE: GS)" (confidence: 0.94)
- **FIBO_REGULATORY_ID**: "CUSIP: 912828XG0" (confidence: 0.97)
- **FIBO_CURRENCY**: "€500,000" (confidence: 0.95)
- **FIBO_FINANCIAL_RATIO**: "P/E ratio of 18.5" (confidence: 0.91)
- **FIBO_FINANCIAL_INSTITUTION**: "Morgan Stanley" (confidence: 0.89)

#### FIBO Entities Created
1. **FIBOFinancialInstrument**: Goldman Sachs equity
   - Risk Category: MEDIUM (score: 0.7)
   - Instrument Type: EQUITY
   - Currency: USD

2. **FIBOFinancialInstrument**: Treasury Bond
   - Risk Category: LOW (score: 0.3)
   - Instrument Type: BOND
   - Maturity: 10 years

3. **FIBOMarketData**: Currency pair data
   - Data Type: PRICE
   - Currency: EUR
   - Value: 500000

#### Financial Insights Generated
- **Portfolio Value**: $2,500,000
- **Risk Score**: 0.65 (Medium)
- **Diversification**: 2 equity, 1 bond, 2 currencies
- **Client Segment**: Corporate
- **Compliance Status**: Compliant

#### CRM Integration
- **Contact Updated**: Financial profile added to Mr. Johnson
- **Knowledge Elements**: 3 business knowledge elements created
- **Activities**: Financial analysis activity logged
- **Relationships**: 4 entity relationships established

## 7. Benefits of This Architecture

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

## 8. Usage Examples

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
