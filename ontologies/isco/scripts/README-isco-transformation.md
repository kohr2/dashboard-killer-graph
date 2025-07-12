# ISCO Data Transformation and Ingestion

This directory contains scripts for transforming ISCO (International Standard Classification of Occupations) data and ingesting it into the dashboard killer knowledge graph.

## Overview

The ISCO classification system provides a standardized way to categorize occupations worldwide. These scripts transform ISCO data into a format compatible with the ISCO ontology and ingest it into the Neo4j database.

## Features

- **Automatic Data Download**: Downloads ISCO data from the official repository
- **Ruby Seeds Parsing**: Parses the Ruby seeds file format used by the ISCO repository
- **Ontology Transformation**: Converts ISCO data into ontology entities and relationships
- **Job Title Mapping**: Generates mappings between job titles and ISCO codes
- **English Language Support**: All data is processed in English
- **Comprehensive Dataset Creation**: Combines ISCO structure with job title mappings
- **Database Ingestion**: Loads data into Neo4j with vector embeddings
- **Multiple Output Formats**: Saves data in various formats for different use cases

## ISCO Hierarchy

The scripts process the four-level ISCO hierarchy:

1. **Major Groups** (1-digit codes): e.g., "Managers", "Professionals"
2. **Sub-Major Groups** (2-digit codes): e.g., "Chief executives, senior officials and legislators"
3. **Minor Groups** (3-digit codes): e.g., "Chief executives, senior officials and legislators"
4. **Unit Groups** (4-digit codes): e.g., "Chief executives, senior officials and legislators"

## Generated Files

The scripts generate the following files in the `data/` directory:

- `isco-entities-english.json`: All ISCO entities organized by type (English)
- `isco-relationships.json`: Parent-child and type relationships
- `isco-ontology-data.json`: Combined entities and relationships
- `isco-stats.json`: Statistics about the transformed data
- `job-title-to-isco-mapping.json`: Mapping between job titles and ISCO codes
- `comprehensive-isco-dataset-english.json`: Combined ISCO structure and job titles for ingestion

## Scripts

### 1. Data Transformation (`transform-isco-data.ts`)

Transforms raw ISCO data into ontology-compatible format.

```bash
# From the project root
npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/transform-isco-data.ts
```

### 2. Comprehensive Dataset Creation (`create-comprehensive-isco-dataset.ts`)

Creates a comprehensive dataset combining ISCO structure with job title mappings.

```bash
# Create dataset with 500 job titles
npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/create-comprehensive-isco-dataset.ts --max-job-titles 500

# Create dataset with all job titles (73,380+)
npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/create-comprehensive-isco-dataset.ts
```

### 3. Database Ingestion (Generic Script)

Ingests the comprehensive dataset into the Neo4j database using the generic ontology-agnostic script.

```bash
# Ingest first 100 records
npx ts-node -r tsconfig-paths/register scripts/ontology/ingest-ontology-dataset.ts --ontology-name isco --limit 100

# Ingest all records
npx ts-node -r tsconfig-paths/register scripts/ontology/ingest-ontology-dataset.ts --ontology-name isco
```

### 4. Data Verification (Generic Script)

Verifies that ISCO data has been successfully ingested into the database using the generic verification script.

```bash
npx ts-node -r tsconfig-paths/register scripts/ontology/verify-ontology-data.ts --ontology-name isco
```

## Usage Workflow

### Complete ISCO Data Pipeline

1. **Transform Raw Data**:
   ```bash
   npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/transform-isco-data.ts
   ```

2. **Create Comprehensive Dataset**:
   ```bash
   npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/create-comprehensive-isco-dataset.ts --max-job-titles 500
   ```

3. **Ingest into Database**:
   ```bash
   npx ts-node -r tsconfig-paths/register scripts/ontology/ingest-ontology-dataset.ts --ontology-name isco --limit 100
   ```

4. **Verify Ingestion**:
   ```bash
   npx ts-node -r tsconfig-paths/register scripts/ontology/verify-ontology-data.ts --ontology-name isco
   ```

### Running Tests

```bash
# Run the transformation script tests
npm test -- ontologies/isco/scripts/__tests__/transform-isco-data.test.ts

# Run all ISCO plugin tests
npm test -- ontologies/isco/
```

## Data Sources

### ISCO Data
- **Source**: [patriciomacadden/isco](https://github.com/patriciomacadden/isco)
- **Format**: Ruby seeds file
- **License**: MIT
- **URL**: https://raw.githubusercontent.com/patriciomacadden/isco/master/db/seeds.rb

### Job Titles Data
- **Source**: [jneidel/job-titles](https://github.com/jneidel/job-titles)
- **Format**: JSON
- **License**: MIT
- **URL**: https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json

## Output Structure

### Entities (English)

Each ISCO group is represented as an entity with the following properties:

```json
{
  "ISCOMajorGroup_1": {
    "code": "1",
    "name": "Managers",
    "description": "Managers plan, direct, coordinate and evaluate the overall activities of enterprises, governments and other organizations...",
    "level": "major"
  }
}
```

### Relationships

#### Parent Relationships
```json
{
  "ISCO_GROUP_PARENT": [
    {
      "source": "ISCOSubMajorGroup_11",
      "target": "ISCOMajorGroup_1"
    }
  ]
}
```

#### Type Relationships
```json
{
  "ISCO_GROUP_TYPE": [
    {
      "source": "ISCOMajorGroup_1",
      "target": "ISCOMajorGroup_1",
      "type": "ISCOMajorGroup"
    }
  ]
}
```

### Job Title Mapping

The script generates a mapping between job titles and ISCO codes:

```json
{
  "software engineer": ["2511", "2512", "2513"],
  "data scientist": ["2511", "2512"],
  "marketing manager": ["1121", "1122"]
}
```

## Database Integration

The transformed data is integrated into the Neo4j database with:

1. **Vector Embeddings**: Each entity gets semantic embeddings for similarity search
2. **Graph Structure**: Entities are connected via relationships
3. **Ontology Labels**: Proper labeling for ISCO and JobTitle entities
4. **Properties**: Rich metadata including codes, descriptions, and levels

### Current Database Status

- **10 ISCO Major Groups** (English)
- **80 Job Titles** (English sample)
- **Vector embeddings** for semantic search
- **Neo4j graph structure** for complex queries

## Language Support

All ISCO data is now processed in **English**:

- ✅ **English ISCO entities**: `isco-entities-english.json`
- ✅ **English comprehensive dataset**: `comprehensive-isco-dataset-english.json`
- ✅ **English database content**: All ingested entities in English
- ❌ **Spanish translations**: Removed from database

## Error Handling

The scripts include comprehensive error handling for:

- Network failures during data download
- Malformed Ruby seeds file
- File system errors
- Invalid data structures
- Database connection issues
- NLP service failures

## Performance Considerations

- The script downloads data from external sources, so network connectivity is required
- Large datasets may take time to process
- Generated files are cached locally for subsequent runs
- Database ingestion includes vector embedding generation (requires NLP service)
- Batch processing is used for large datasets

## Dependencies

- `axios`: For HTTP requests
- `fs`: For file system operations
- `path`: For path manipulation
- `neo4j-driver`: For database operations
- `tsyringe`: For dependency injection
- NLP Service: For vector embeddings

## Testing

The scripts include comprehensive tests covering:

- Data download functionality
- Ruby seeds file parsing
- Ontology transformation
- File saving operations
- Job title mapping generation
- Database ingestion
- Error handling scenarios

Run tests with:

```bash
npm test -- ontologies/isco/scripts/__tests__/transform-isco-data.test.ts
```

## Contributing

When modifying the transformation scripts:

1. Update tests to cover new functionality
2. Ensure error handling is comprehensive
3. Update this documentation
4. Test with real ISCO data
5. Verify output format compatibility with the ontology
6. Maintain English language support

## Troubleshooting

### Common Issues

1. **Network Errors**: Ensure internet connectivity and check if the ISCO repository is accessible
2. **Parsing Errors**: The Ruby seeds file format may change; update parsing logic accordingly
3. **File Permission Errors**: Ensure write permissions for the output directory
4. **Memory Issues**: Large datasets may require additional memory allocation
5. **Database Connection**: Ensure Neo4j is running and accessible
6. **NLP Service**: Ensure the NLP service is running for vector embeddings

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npx ts-node -r tsconfig-paths/register ontologies/isco/scripts/transform-isco-data.ts
```

## Recent Changes

- **Language Standardization**: All data now processed in English
- **Comprehensive Dataset**: Combined ISCO structure with job title mappings
- **Database Ingestion**: Direct ingestion into Neo4j with vector embeddings
- **Verification Scripts**: Tools to verify successful data ingestion
- **Performance Optimization**: Batch processing for large datasets 