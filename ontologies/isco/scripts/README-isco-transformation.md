# ISCO Data Transformation Script

This script transforms ISCO (International Standard Classification of Occupations) data into a format compatible with the ISCO ontology.

## Overview

The ISCO classification system provides a standardized way to categorize occupations worldwide. This script downloads ISCO data from the official GitHub repository and transforms it into the ontology format used by the ISCO plugin.

## Features

- **Automatic Data Download**: Downloads ISCO data from the official repository
- **Ruby Seeds Parsing**: Parses the Ruby seeds file format used by the ISCO repository
- **Ontology Transformation**: Converts ISCO data into ontology entities and relationships
- **Job Title Mapping**: Generates mappings between job titles and ISCO codes
- **Multiple Output Formats**: Saves data in various formats for different use cases

## ISCO Hierarchy

The script processes the four-level ISCO hierarchy:

1. **Major Groups** (1-digit codes): e.g., "Managers", "Professionals"
2. **Sub-Major Groups** (2-digit codes): e.g., "Chief executives, senior officials and legislators"
3. **Minor Groups** (3-digit codes): e.g., "Chief executives, senior officials and legislators"
4. **Unit Groups** (4-digit codes): e.g., "Chief executives, senior officials and legislators"

## Generated Files

The script generates the following files in the `data/` directory:

- `isco-entities.json`: All ISCO entities organized by type
- `isco-relationships.json`: Parent-child and type relationships
- `isco-ontology-data.json`: Combined entities and relationships
- `isco-stats.json`: Statistics about the transformed data
- `job-title-to-isco-mapping.json`: Mapping between job titles and ISCO codes

## Usage

### Running the Script

```bash
# From the project root
npm run ts-node ontologies/isco/scripts/transform-isco-data.ts

# Or using ts-node directly
npx ts-node ontologies/isco/scripts/transform-isco-data.ts
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

### Entities

Each ISCO group is represented as an entity with the following properties:

```json
{
  "ISCOMajorGroup_1": {
    "code": "1",
    "name": "Directores y gerentes",
    "description": "ISCO Major Group 1: Directores y gerentes",
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
  "Software Engineer": ["2511", "2512", "2513"],
  "Data Scientist": ["2511", "2512"],
  "Marketing Manager": ["1121", "1122"]
}
```

## Integration with Ontology

The transformed data can be integrated into the ISCO ontology by:

1. Loading the generated JSON files
2. Creating ontology entities from the ISCO data
3. Establishing relationships between job titles and ISCO classifications
4. Using the mapping for entity extraction and enrichment

## Error Handling

The script includes comprehensive error handling for:

- Network failures during data download
- Malformed Ruby seeds file
- File system errors
- Invalid data structures

## Performance Considerations

- The script downloads data from external sources, so network connectivity is required
- Large datasets may take time to process
- Generated files are cached locally for subsequent runs

## Dependencies

- `axios`: For HTTP requests
- `fs`: For file system operations
- `path`: For path manipulation

## Testing

The script includes comprehensive tests covering:

- Data download functionality
- Ruby seeds file parsing
- Ontology transformation
- File saving operations
- Job title mapping generation
- Error handling scenarios

Run tests with:

```bash
npm test -- ontologies/isco/scripts/__tests__/transform-isco-data.test.ts
```

## Contributing

When modifying the transformation script:

1. Update tests to cover new functionality
2. Ensure error handling is comprehensive
3. Update this documentation
4. Test with real ISCO data
5. Verify output format compatibility with the ontology

## Troubleshooting

### Common Issues

1. **Network Errors**: Ensure internet connectivity and check if the ISCO repository is accessible
2. **Parsing Errors**: The Ruby seeds file format may change; update parsing logic accordingly
3. **File Permission Errors**: Ensure write permissions for the output directory
4. **Memory Issues**: Large datasets may require additional memory allocation

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run ts-node ontologies/isco/scripts/transform-isco-data.ts
``` 