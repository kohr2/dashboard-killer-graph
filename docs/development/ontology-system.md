# Ontology System Documentation

## Overview

The ontology system provides a unified approach to managing multiple ontologies, data sources, and formats. It supports both **pre-structured datasets** (direct ingestion) and **unstructured text** (LLM processing) with automatic code generation and validation.

## Success Case Study: ISCO Dataset

**Completed Successfully**: Full ISCO dataset with 73,379 job titles ingested into `jobboardkiller` database.

```bash
# Command used
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology isco --database jobboardkiller

# Results
✅ 73,379 JobTitle entities created
✅ 10 ISCO structure entities (major groups)
✅ Ontology node with HAS_ENTITY relationships
✅ Direct ingestion (no LLM) - 10x faster
✅ Proper UUIDs assigned (JobTitle_1 to JobTitle_73379)
```

## Architecture

### Core Components

```
scripts/ontology/
├── build-ontology.ts              # Ontology builder CLI
├── ingest-ontology-dataset.ts     # Dataset ingestion CLI
├── verify-ontology-data.ts        # Data verification CLI
├── config.ts                      # Configuration interfaces
├── extractor.ts                   # Ontology extraction
├── merger.ts                      # Ontology merging
└── sources/                       # Source handlers
    └── owl-source.ts             # OWL/RDF support

src/platform/processing/
├── ontology-dataset-ingestion.service.ts  # Ingestion service
└── ontology-verification.service.ts       # Verification service
```

### Standard Ontology Structure

Entities now support explicit inheritance and improved label recognition:

- Each entity may have a top-level `parent` field (string) indicating its parent class (if any).
- The build process automatically aggregates parent labels as `alternativeLabels` (synonyms) for subclasses, improving entity recognition and enrichment.
- The legacy `parentClass` property in `properties` is no longer present in the output.

**Example:**
```json
{
  "name": "AccessTerm",
  "description": "Conditions and stipulations about where and how to access the Procurement Documents.",
  "properties": {
    "label": { "type": "string", "description": "Preferred label for this entity" },
    "definition": { "type": "string", "description": "Detailed definition of this entity" },
    "alternativeLabels": ["Term"]
  },
  "keyProperties": ["name"],
  "vectorIndex": true,
  "documentation": "http://data.europa.eu/a4g/ontology#AccessTerm",
  "parent": "Term"
}
```

This structure is now standard for all ontologies built with the system.

```json
{
  "entities": {
    "EntityType": {
      "properties": {
        "name": { "type": "string", "required": true },
        "code": { "type": "string" }
      },
      "vectorIndex": true
    }
  },
  "relationships": {
    "RELATIONSHIP_TYPE": {
      "source": "EntityType",
      "target": "EntityType",
      "properties": {}
    }
  }
}
```

### Ontology-Specific Transformation Scripts

All ontology-specific transformation scripts (such as `transform-geonames-data.ts`, `transform-sp500-data.ts`) **must** reside in their respective ontology folders (e.g., `ontologies/geonames/`, `ontologies/sp500/`).

> **Convention:** Do not place ontology-specific scripts in `scripts/ontology/`. Always keep them with their ontology's data and config for maintainability and clarity.

## Ingestion Modes

### 1. Direct Ingestion (Default)
For pre-structured datasets with defined entities and relationships:

```bash
# Fast, no LLM processing
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology isco --database jobboardkiller
```

**Benefits:**
- ✅ 10x faster processing
- ✅ No LLM costs
- ✅ Perfect accuracy
- ✅ No external dependencies

### 2. LLM Processing (Optional)
For unstructured text that needs entity extraction:

```bash
# LLM processing for text extraction
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology isco --database jobboardkiller --use-llm
```

**Use when:**
- Dataset contains unstructured text
- Need to extract entities from content
- Higher accuracy through LLM understanding

## Configuration Files

### config.json
```json
{
  "name": "ontology-name",
  "version": "1.0.0",
  "description": "Ontology description",
  "enabled": true,
  "datasets": [
    {
      "name": "default-dataset",
      "description": "Default dataset",
      "path": "data/dataset.json",
      "default": true
    }
  ]
}
```

### ontology.json
```json
{
  "entities": {
    "EntityType": {
      "properties": {
        "name": { "type": "string", "required": true },
        "code": { "type": "string" }
      },
      "vectorIndex": true
    }
  },
  "relationships": {
    "RELATIONSHIP_TYPE": {
      "source": "EntityType",
      "target": "EntityType",
      "properties": {}
    }
  }
}
```

## Dataset Format

### Standard Structure
```json
{
  "metadata": {
    "source": "transformation-script",
    "ontology": "ontology-name",
    "version": "1.0.0",
    "createdAt": "2024-01-15T10:30:00Z",
    "recordCount": 1000
  },
  "records": [
    {
      "id": "unique-record-id",
      "type": "EntityType",
      "content": "Text content for NLP processing",
      "properties": {
        "name": "Entity Name",
        "code": "123"
      },
      "relationships": [
        {
          "type": "RELATIONSHIP_TYPE",
          "target": "target-record-id"
        }
      ]
    }
  ]
}
```

## CLI Commands

### Ingestion
```bash
# Basic ingestion (direct mode)
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology <name> --database <db-name>

# With LLM processing
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology <name> --database <db-name> --use-llm

# With options
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology <name> --database <db-name> --limit 100
```

### Verification
```bash
# Verify data
npx ts-node scripts/ontology/verify-ontology-data.ts --ontology-name <name> --database <db-name>

# Clear data
npx ts-node scripts/ontology/clear-ontology-data.ts --ontology-name <name> --database <db-name>

# Multiple ontologies
npx ts-node scripts/ontology/verify-ontology-data.ts --ontology-names isco,fibo,procurement --database <db-name>
```

### Ontology Building
```bash
# Build ontology from source
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 100

# Build with importance filtering
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 50 --top-relationships 50
```