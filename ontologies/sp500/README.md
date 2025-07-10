# Companies Ontology Plugin

## Overview

The Companies ontology plugin provides comprehensive entity and relationship schemas for identifying, classifying, and analyzing business organizations, industries, and related business concepts. This plugin is designed to work with company datasets like S&P 500, Fortune 500, and other business entity data sources.

## Features

- **Company Entities**: Complete schema for business organizations with properties like ticker symbols, CIK codes, and financial data
- **Industry Classification**: Hierarchical industry and sector classification system
- **Business Relationships**: Support for subsidiary relationships, competition analysis, and stock exchange listings
- **Entity Extraction**: Pattern-based extraction for company names, ticker symbols, and industry terms
- **Reasoning Algorithms**: AI-powered classification and relationship identification

## Entities

### Company
Core business organization entity with properties:
- `name`: Company name
- `ticker`: Stock ticker symbol
- `cik`: Central Index Key (SEC identifier)
- `founded`: Company founding date
- `headquarters`: Company headquarters location
- `website`: Company website URL
- `description`: Company description
- `marketCap`: Market capitalization
- `employees`: Number of employees
- `revenue`: Annual revenue
- `lei`: Legal Entity Identifier

### Industry
Business industry classification with properties:
- `name`: Industry name
- `code`: Industry classification code
- `description`: Industry description
- `parentIndustry`: Parent industry if applicable

### Sector
Broad business sector category with properties:
- `name`: Sector name
- `code`: Sector classification code
- `description`: Sector description

### BusinessType
Type of business organization with properties:
- `name`: Business type name
- `description`: Business type description
- `legalStructure`: Legal structure type

### CompanySize
Classification of company size with properties:
- `name`: Size category name
- `description`: Size category description
- `employeeRange`: Employee count range
- `revenueRange`: Revenue range

### StockExchange
Stock exchange where company is listed with properties:
- `name`: Exchange name
- `code`: Exchange code
- `country`: Exchange country
- `description`: Exchange description

## Relationships

### Company Relationships
- `BELONGS_TO_INDUSTRY`: Company belongs to a specific industry
- `BELONGS_TO_SECTOR`: Company belongs to a specific sector
- `HAS_BUSINESS_TYPE`: Company has a specific business type
- `HAS_SIZE`: Company has a specific size classification
- `LISTED_ON`: Company is listed on a stock exchange
- `SUBSIDIARY_OF`: Company is a subsidiary of another company
- `COMPETES_WITH`: Company competes with another company

### Industry Relationships
- `INDUSTRY_BELONGS_TO_SECTOR`: Industry belongs to a sector

## Entity Extraction Patterns

### Company Patterns
- Company name with ticker symbol: `Apple Inc. (AAPL)`
- Standalone ticker symbol: `AAPL`, `MSFT`, `GOOGL`
- Capitalized company names: `Apple Inc.`, `Microsoft Corporation`
- Business suffixes: `Inc`, `Corp`, `LLC`, `Ltd`, `Company`, `Co`

### Industry Patterns
- Common industry terms: Technology, Healthcare, Finance, Manufacturing, Retail, Energy, etc.

### Sector Patterns
- Common sector terms: Technology, Healthcare, Financial, Consumer, Industrial, Energy, etc.

## Reasoning Algorithms

### Company Industry Classification
Classifies companies into industries based on their business description and keywords.

### Company Size Classification
Classifies companies by size based on employee count and revenue.

### Competitor Identification
Identifies competing companies based on industry overlap and market positioning.

## Data Sources

The plugin is designed to work with various company datasets:

### S&P 500 Companies
- **Source**: GitHub - SP500-Wikipedia-Company-Info-Extractor
- **Format**: CSV with ticker, name, and CIK
- **Transformation**: `scripts/ontology/transform-sp500-data.ts`

### Fortune 500 Companies
- **Source**: GitHub - fortune500-distance-matrix
- **Format**: JSON with company rankings and financial data
- **Transformation**: `scripts/ontology/transform-fortune500-data.ts`

### Industry Classifications
- **Source**: NAICS Association
- **Format**: Excel with industry codes and descriptions
- **Transformation**: `scripts/ontology/transform-naics-data.ts`

## Usage

### 1. Enable the Plugin
The plugin is enabled by default. You can configure it in `plugin.config.json`:

```json
{
  "name": "companies",
  "enabled": true,
  "description": "Company and business organization ontology"
}
```

### 2. Transform Data
Transform raw company data into ontology format:

```bash
# Transform S&P 500 data
npx ts-node scripts/ontology/transform-sp500-data.ts

# Transform Fortune 500 data
npx ts-node scripts/ontology/transform-fortune500-data.ts
```

### 3. Ingest Data
Ingest the transformed data into the knowledge graph:

```bash
# Companies-only ingestion (recommended for performance)
npx ts-node scripts/ontology/companies-only-ingestion.ts

# Generic dataset ingestion
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name companies
```

### 4. Use in Applications
The plugin provides entity extraction and enrichment services:

```typescript
import { companiesPlugin } from './ontologies/companies/companies.plugin';

// Extract companies from text
const text = "Apple Inc. (AAPL) and Microsoft Corporation (MSFT) are technology companies.";
// Plugin will extract: Apple Inc., AAPL, Microsoft Corporation, MSFT, technology

// Enrich company entities
// Plugin will add: CIK codes, industry classification, financial data
```

## Configuration

### config.json
Defines dataset sources and enrichment services:

```json
{
  "name": "companies",
  "version": "1.0.0",
  "description": "Company and business organization ontology",
  "enabled": true,
  "datasets": [
    {
      "name": "sp500_companies",
      "description": "S&P 500 companies dataset",
      "url": "https://raw.githubusercontent.com/...",
      "format": "csv",
      "transformation": {
        "script": "scripts/ontology/transform-sp500-data.ts",
        "output": "ontologies/companies/data/sp500_companies.json"
      }
    }
  ],
  "enrichment": {
    "services": [
      {
        "name": "company_info_enrichment",
        "type": "dataset_lookup",
        "config": {
          "dataset": "sp500_companies",
          "matchFields": ["ticker", "name"],
          "outputFields": ["ticker", "cik", "name"]
        }
      }
    ]
  }
}
```

## Testing

Run the plugin tests:

```bash
npm test -- ontologies/companies/__tests__/plugin-loading.test.ts
```

Run the transformation tests:

```bash
npm test -- scripts/ontology/__tests__/transform-sp500-data.test.ts
```

## Data Structure

### Transformed Data Format
The transformation scripts produce JSON files in this format:

```json
{
  "companies": [
    {
      "id": "company_1",
      "name": "Apple Inc.",
      "ticker": "AAPL",
      "cik": "0000320193",
      "type": "Company",
      "properties": {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "cik": "0000320193",
        "description": "Apple Inc. (AAPL) - S&P 500 company"
      }
    }
  ],
  "industries": [...],
  "sectors": [...],
  "exchanges": [...],
  "metadata": {
    "source": "S&P 500 Wikipedia Company Info Extractor",
    "transformedAt": "2024-01-01T00:00:00.000Z",
    "totalCompanies": 500,
    "totalIndustries": 10,
    "totalSectors": 10,
    "totalExchanges": 4
  }
}
```

## Integration

### With Other Ontologies
The Companies plugin can be used alongside other ontologies:

- **CRM Ontology**: Link companies to customers and contacts
- **Financial Ontology**: Connect companies to financial instruments and deals
- **ISCO Ontology**: Relate companies to job titles and employment data

### With External APIs
The plugin supports enrichment from external APIs:

- **Financial Data APIs**: Market cap, revenue, employee count
- **Company Information APIs**: Founded date, headquarters, website
- **Industry Classification APIs**: NAICS, SIC codes

## Performance Considerations

- **Large Datasets**: For datasets with thousands of companies, use the companies-only ingestion script for better performance
- **Memory Usage**: The transformation process loads entire datasets into memory
- **Database Indexing**: Ensure proper indexing on company properties (ticker, CIK) for fast lookups

## Troubleshooting

### Common Issues

1. **Transformation Fails**: Check that the source URLs are accessible and the data format hasn't changed
2. **Ingestion Errors**: Verify that Neo4j is running and the connection credentials are correct
3. **Plugin Not Loading**: Ensure the plugin is enabled in `plugin.config.json`

### Debug Mode
Enable debug logging to troubleshoot issues:

```bash
DEBUG=* npx ts-node scripts/ontology/companies-only-ingestion.ts
```

## Contributing

To extend the Companies plugin:

1. **Add New Entities**: Update `ontology.json` with new entity schemas
2. **Add New Relationships**: Define relationship types in `ontology.json`
3. **Add Extraction Patterns**: Include regex patterns for new entity types
4. **Add Reasoning Algorithms**: Implement classification or relationship identification logic
5. **Add Data Sources**: Create transformation scripts for new datasets

## License

This plugin is part of the main project and follows the same license terms. 