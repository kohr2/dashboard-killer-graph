# Generic Dataset Ingestion

## Overview

This document explains the **ontology-agnostic** approach to dataset ingestion that uses both `config.json` and `ontology.json` to validate and process any dataset that matches the ontology schema.

## 🎯 Why Generic Ingestion?

The system now provides a **completely ontology-agnostic ingestion service** that:

1. **Uses Both Configuration Files**: Leverages `config.json` for metadata and `ontology.json` for schema validation
2. **Validates Data Structure**: Ensures datasets conform to the ontology schema before ingestion
3. **Works with Any Ontology**: No custom ingestion logic needed for new ontologies
4. **Leverages Existing Infrastructure**: Uses the proven `GenericIngestionPipeline`

## 🏗️ Architecture

```
📊 Generic Dataset (JSON)
    │
    ├─ 1. Load config.json & ontology.json
    │   └─ Validation & Schema Definition
    │
    ├─ 2. Validate Dataset Structure
    │   └─ Entity Types & Relationship Types
    │
    ├─ 3. Convert to Ingestion Inputs
    │   └─ Generic Format
    │
    ├─ 4. Generic Ingestion Pipeline
    │   └─ src/ingestion/pipeline/generic-ingestion-pipeline.ts
    │
    └─ 5. Database Insertion
        └─ Neo4j via ontology.json schema
```

## 📋 Configuration Files

### config.json
Defines ontology metadata and dataset information:

```json
{
  "name": "ontology-name",
  "version": "1.0.0",
  "description": "Ontology description",
  "enabled": true,
  "priority": 1,
  "source": {
    "url": "https://source-url.com",
    "type": "json",
    "version": "1.0.0",
    "description": "Source description"
  },
  "extraction": {
    "entities": {},
    "relationships": {}
  },
  "datasets": {
    "dataset-key": {
      "name": "Dataset Name",
      "description": "Dataset description",
      "source": "data-source",
      "url": "https://dataset-url.com",
      "format": "json",
      "records": 1000
    }
  }
}
```

### ontology.json
Defines the schema for entities and relationships:

```json
{
  "entities": {
    "EntityType": {
      "name": "EntityType",
      "description": "Entity description",
      "properties": {
        "name": { "type": "string" },
        "code": { "type": "string" }
      }
    }
  },
  "relationships": {
    "RELATIONSHIP_TYPE": {
      "name": "RELATIONSHIP_TYPE",
      "description": "Relationship description",
      "source": "EntityType",
      "target": "EntityType"
    }
  }
}
```

## 📊 Generic Dataset Format

Datasets must be converted to this generic format:

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
        "code": "123",
        "description": "Entity description"
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

## 🚀 Usage

### Basic Ingestion

```bash
# Ingest dataset for an ontology
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco

# Ingest with custom dataset path
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco --dataset-path ./custom-dataset.json

# Dry run to see what would be processed
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco --dry-run

# Limit number of records
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco --limit 100
```

### List Available Datasets

```bash
# List datasets configured for an ontology
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --list-datasets isco
```

### CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--ontology-name` | Name of ontology | `--ontology-name isco` |
| `--config-path` | Path to config file | `--config-path ./custom-config.json` |
| `--dataset-path` | Path to dataset file | `--dataset-path ./custom-dataset.json` |
| `--limit` | Limit records to process | `--limit 100` |
| `--dry-run` | Show what would be processed | `--dry-run` |
| `--list-datasets` | List available datasets | `--list-datasets isco` |

## 🔧 Workflow

### Step 1: Transform Raw Data
Convert your raw data to the generic format using transformation scripts:

```bash
# Example: Transform ISCO data
npm run transform:isco
```

This creates `ontologies/isco/data/generic-dataset.json`.

### Step 2: Validate Configuration
Ensure both `config.json` and `ontology.json` exist and are valid:

```bash
# Check configuration
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --list-datasets isco
```

### Step 3: Ingest Dataset
Use the generic ingestion service:

```bash
# Ingest the dataset
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco
```

## ✅ Benefits

### 1. **Ontology Agnostic**
- Works with any ontology that has valid `config.json` and `ontology.json`
- No custom ingestion logic needed
- Reusable across different ontologies

### 2. **Schema Validation**
- Data automatically validated against ontology schema
- Ensures consistency with ontology definitions
- Prevents invalid data insertion

### 3. **Configuration Driven**
- Uses `config.json` for metadata and dataset information
- Uses `ontology.json` for schema validation
- Easy to configure and maintain

### 4. **Leverages Existing Infrastructure**
- Uses proven `GenericIngestionPipeline`
- Integrates with existing services
- Follows established patterns

### 5. **Maintainable**
- Single ingestion pattern for all ontologies
- Clear separation of concerns
- Easy to understand and modify

## 🔍 How It Works

### 1. **Configuration Loading**
The service loads both `config.json` and `ontology.json` to understand:
- Ontology metadata and settings
- Valid entity and relationship types
- Dataset configuration

### 2. **Dataset Validation**
The dataset is validated against the ontology schema:
- Checks ontology name matches
- Validates entity types against schema
- Validates relationship types against schema
- Warns about invalid types but continues processing

### 3. **Data Conversion**
Dataset records are converted to ingestion inputs:
- Preserves all properties
- Maintains relationships
- Adds metadata for tracking

### 4. **Generic Pipeline**
Uses the existing `GenericIngestionPipeline`:
- Processes content through NLP service
- Extracts entities and relationships
- Inserts into Neo4j using ontology schema

## 🚀 Adding New Ontologies

To add ingestion support for a new ontology:

### 1. Create Ontology Plugin
```bash
mkdir ontologies/new-ontology
# Add ontology.json, config.json, plugin.ts
```

### 2. Create Transformation Script
```typescript
// scripts/transform-new-ontology-data.ts
// Convert raw data to generic format
```

### 3. Use Generic Ingestion
```bash
# Transform data
npm run transform:new-ontology

# Ingest using generic service
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name new-ontology
```

## 📝 Example: ISCO Ontology

### Configuration Files
- `ontologies/isco/config.json` - Defines ISCO metadata and datasets
- `ontologies/isco/ontology.json` - Defines ISCO entity and relationship schemas

### Transformation Script
- `ontologies/isco/scripts/transform-isco-data.ts` - Converts raw ISCO data to generic format

### Generic Dataset
- `ontologies/isco/data/generic-dataset.json` - Generic format dataset

### Ingestion
```bash
# Transform raw data
npm run transform:isco

# Ingest using generic service
npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco
```

## 🎉 Conclusion

The generic dataset ingestion approach provides a powerful, reusable foundation for ingesting any structured data into the knowledge graph. By using both `config.json` and `ontology.json`, it ensures data consistency and maintainability while being completely ontology-agnostic.

**Key Takeaway**: The combination of configuration files + generic ingestion pipeline eliminates the need for custom ingestion logic while ensuring data quality and consistency. 