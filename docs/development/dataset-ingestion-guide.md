# Dataset Ingestion Guide

## Overview

This guide explains how to download datasets for ontologies and ingest them into the knowledge graph using the unified ingestion pipeline.

## 🎯 What's New

The system now supports:
- **Automatic dataset downloading** from various sources (JSON, APIs, etc.)
- **JSONPath-based extraction** for flexible data parsing
- **Caching** to avoid re-downloading datasets
- **Integration with existing ontology pipeline** for seamless ingestion
- **Dry-run mode** for testing without actual ingestion

## 🏗️ Architecture

### Components

1. **JsonSource** (`scripts/ontology/sources/json-source.ts`)
   - Handles JSON dataset downloads and caching
   - Uses JSONPath for flexible data extraction
   - Supports various JSON structures (arrays, objects, nested data)

2. **Dataset Ingestion CLI** (`scripts/ontology/dataset-ingestion.ts`)
   - Main CLI tool for dataset ingestion
   - Integrates with existing ontology processing
   - Uses the unified ingestion pipeline

3. **Configuration System** (`ontologies/*/config.json`)
   - Defines dataset sources and extraction rules
   - Supports overrides and customizations
   - Version tracking and metadata

## 📋 Configuration

### Basic Configuration Structure

Each ontology can have a dataset configuration in its `config.json`:

```json
{
  "name": "job-titles",
  "source": {
    "url": "https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json",
    "type": "json",
    "version": "1.0.0",
    "description": "Comprehensive job titles dataset with ISCO classification"
  },
  "dataset": {
    "downloadUrl": "https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json",
    "format": "json",
    "license": "MIT",
    "description": "A large, open-source list of job titles"
  },
  "extraction": {
    "entities": {
      "path": "$.job-titles[*]",
      "name": ".",
      "description": "Job title from the dataset"
    },
    "relationships": {
      "path": "$.relationships[*]",
      "name": "name",
      "description": "description",
      "source": "source",
      "target": "target"
    }
  },
  "overrides": {
    "entities": {
      "JobTitle": {
        "properties": {
          "normalizedTitle": {
            "type": "string",
            "description": "Standardized version of the job title for matching"
          }
        }
      }
    }
  },
  "metadata": {
    "lastExtraction": "2024-01-15T10:30:00Z",
    "sourceVersion": "1.0.0",
    "localVersion": "1.0.0"
  }
}
```

### JSONPath Extraction Rules

The system uses JSONPath expressions to extract data:

#### Entity Extraction
```json
{
  "path": "$.entities[*]",           // JSONPath to find entity nodes
  "name": "$.name",                  // JSONPath to extract entity name
  "description": "$.description"     // JSONPath to extract description
}
```

#### Relationship Extraction
```json
{
  "path": "$.relationships[*]",      // JSONPath to find relationship nodes
  "name": "$.name",                  // JSONPath to extract relationship name
  "description": "$.description",    // JSONPath to extract description
  "source": "$.source",              // JSONPath to extract source entity
  "target": "$.target"               // JSONPath to extract target entity
}
```

### Supported Data Structures

The system can handle various JSON structures:

#### Array of Items
```json
[
  { "name": "Item 1", "description": "First item" },
  { "name": "Item 2", "description": "Second item" }
]
```

#### Object with Items Array
```json
{
  "items": [
    { "name": "Item 1", "description": "First item" },
    { "name": "Item 2", "description": "Second item" }
  ]
}
```

#### Object with Data Array
```json
{
  "data": [
    { "name": "Item 1", "description": "First item" },
    { "name": "Item 2", "description": "Second item" }
  ]
}
```

#### Single Object
```json
{
  "name": "Single Item",
  "description": "A single item"
}
```

## 🚀 Usage

### Basic Dataset Ingestion

```bash
# Ingest job titles dataset
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles

# Limit to first 100 items
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --limit 100

# Dry run to see what would be processed
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --dry-run
```

### Advanced Usage

```bash
# Use custom config file
npx ts-node scripts/ontology/dataset-ingestion.ts --config-path ./custom-config.json

# Override dataset URL
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --dataset-url https://api.example.com/jobs

# Specify dataset type
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --dataset-type json
```

### CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--ontology-name` | Name of ontology (uses `ontologies/<name>/config.json`) | `--ontology-name job-titles` |
| `--config-path` | Path to custom configuration file | `--config-path ./custom.json` |
| `--dataset-url` | Override dataset URL from config | `--dataset-url https://api.example.com/data` |
| `--dataset-type` | Dataset type (json, csv, api) | `--dataset-type json` |
| `--limit` | Limit number of items to process | `--limit 100` |
| `--dry-run` | Show what would be processed without ingesting | `--dry-run` |
| `--output-dir` | Custom output directory | `--output-dir ./output` |
| `--help` | Show help message | `--help` |

## 📊 Examples

### Example 1: Job Titles Dataset

```bash
# Download and ingest job titles dataset
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --limit 50
```

This will:
1. Download the job titles JSON dataset
2. Extract job titles as entities using JSONPath
3. Process them through the NLP service
4. Store them in Neo4j with proper entity resolution

### Example 2: Custom API Dataset

Create a custom config file `custom-api.json`:

```json
{
  "name": "custom-api",
  "source": {
    "url": "https://api.example.com/companies",
    "type": "json",
    "version": "1.0.0",
    "description": "Company data from custom API"
  },
  "extraction": {
    "entities": {
      "path": "$.companies[*]",
      "name": "$.name",
      "description": "$.description"
    },
    "relationships": {
      "path": "$.relationships[*]",
      "name": "$.type",
      "description": "$.description",
      "source": "$.from",
      "target": "$.to"
    }
  },
  "overrides": {
    "entities": {},
    "relationships": {}
  },
  "metadata": {
    "lastExtraction": "",
    "sourceVersion": "1.0.0",
    "localVersion": "1.0.0"
  }
}
```

Then ingest:

```bash
npx ts-node scripts/ontology/dataset-ingestion.ts --config-path ./custom-api.json --dry-run
```

## 🔧 Development

### Adding New Dataset Sources

To add support for new dataset formats:

1. Create a new source handler in `scripts/ontology/sources/`
2. Implement the `OntologySource` interface
3. Add it to the processor in `dataset-ingestion.ts`

Example for CSV support:

```typescript
export class CsvSource implements OntologySource {
  name = 'CSV Source';
  
  canHandle(url: string): boolean {
    return url.includes('csv') || url.endsWith('.csv');
  }
  
  async fetch(url: string): Promise<string> {
    // Download CSV file
  }
  
  async parse(content: string): Promise<ParsedOntology> {
    // Parse CSV content
  }
  
  async extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]> {
    // Extract entities from CSV
  }
  
  async extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]> {
    // Extract relationships from CSV
  }
}
```

### Testing

Run tests for the JSON source:

```bash
npm test -- scripts/ontology/__tests__/json-source.test.ts
```

## 🎯 Best Practices

### 1. Use Dry Run First
Always test with `--dry-run` to see what would be processed:

```bash
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --dry-run
```

### 2. Start Small
Use `--limit` to test with a small subset:

```bash
npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles --limit 10
```

### 3. Validate JSONPath
Test your JSONPath expressions with online tools like [JSONPath Tester](https://jsonpath.com/)

### 4. Cache Management
Datasets are cached in `cache/datasets/`. Clear cache if needed:

```bash
rm -rf cache/datasets/
```

### 5. Monitor Processing
Check logs for processing status and any errors during ingestion.

## 🐛 Troubleshooting

### Common Issues

1. **Dataset not found**
   - Check the URL in the config file
   - Verify the dataset is publicly accessible
   - Try downloading manually to test

2. **JSONPath extraction fails**
   - Validate JSONPath expressions
   - Check the actual structure of your dataset
   - Use `--dry-run` to see what's being extracted

3. **Ingestion pipeline errors**
   - Ensure Neo4j is running and accessible
   - Check that ontologies are properly registered
   - Verify NLP service is running

4. **Memory issues with large datasets**
   - Use `--limit` to process in smaller batches
   - Consider splitting large datasets

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npx ts-node scripts/ontology/dataset-ingestion.ts --ontology-name job-titles
```

## 📈 Performance

### Optimization Tips

1. **Use caching**: Datasets are automatically cached to avoid re-downloading
2. **Batch processing**: The system processes items in batches for efficiency
3. **Limit processing**: Use `--limit` for large datasets
4. **Dry run first**: Always test with `--dry-run` before full ingestion

### Monitoring

Monitor ingestion progress through console output:
- Download progress
- Processing statistics
- Entity/relationship counts
- Error reporting

## 🔄 Integration

The dataset ingestion system integrates seamlessly with:

- **Existing ontology pipeline**: Uses the same processing services
- **NLP service**: Leverages existing entity extraction
- **Neo4j storage**: Uses existing ingestion services
- **Entity resolution**: Automatic deduplication and linking
- **Vector search**: Automatic embedding generation

## 📚 Related Documentation

- [Ontology Script Architecture](./ontology-script-architecture.md)
- [Unified Data Ingestion Architecture](../architecture/unified-data-ingestion-architecture.md)
- [Email Ingestion Ontology](../architecture/email-ingestion-ontology.md)
- [Pipeline Guidelines](../../PIPELINE_GUIDELINES.md) 