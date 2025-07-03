# Ontology Scripts Documentation

## Overview

The `scripts/ontology` directory contains a comprehensive ontology processing system designed to extract, transform, and merge ontologies from various sources. This system supports multiple ontology formats and provides a flexible framework for ontology management.

## Architecture

The ontology processing system follows a modular architecture with clear separation of concerns:

```
scripts/ontology/
├── cli.ts              # Main CLI processor and orchestration
├── config.ts           # Configuration interfaces and validation
├── ontology-source.ts  # Core interfaces and types
├── extractor.ts        # Ontology extraction logic
├── merger.ts          # Ontology merging and override logic
├── sources/           # Source-specific implementations
│   └── owl-source.ts  # OWL/RDF ontology source handler
└── __tests__/         # Comprehensive test suite
```

## Core Components

### 1. OntologyProcessor (`cli.ts`)

The main orchestrator that coordinates the entire ontology processing pipeline.

**Key Features:**
- Configuration validation
- Source handler discovery
- Extraction orchestration
- Merging and override application
- Error handling and result reporting

**Usage:**
```typescript
const processor = new OntologyProcessor([owlSource, jsonSource]);
const result = await processor.processOntology(config);
```

### 2. Configuration System (`config.ts`)

Defines the structure and validation rules for ontology processing configurations.

**Key Interfaces:**

#### Source Configuration
```typescript
interface Source {
  url: string;           // Source URL
  type: 'owl' | 'rdf' | 'json' | 'other';
  version: string;       // Source version
  description: string;   // Human-readable description
}
```

#### Extraction Rules
```typescript
interface ExtractionRule {
  path: string;          // XPath or JSON path for extraction
  name: string;          // Rule name
  description: string;   // Rule description
  properties?: {         // Property mapping rules
    path: string;
    name: string;
    type: string;
  };
}
```

#### Override Configuration
```typescript
interface OverrideConfig {
  entities: Record<string, any>;      // Entity overrides
  relationships: Record<string, any>; // Relationship overrides
}
```

### 3. Ontology Source Interface (`ontology-source.ts`)

Defines the contract for ontology source handlers.

**Core Interfaces:**

#### Entity
```typescript
interface Entity {
  name: string;                    // Entity name
  description: string;             // Human-readable description
  properties: Record<string, any>; // Entity properties
  keyProperties: string[];         // Primary key properties
  vectorIndex: boolean;            // Whether to create vector index
  documentation?: string;          // Additional documentation
}
```

#### Relationship
```typescript
interface Relationship {
  name: string;           // Relationship name
  description: string;    // Human-readable description
  source: string;         // Source entity type
  target: string;         // Target entity type
  documentation?: string; // Additional documentation
}
```

#### OntologySource Interface
```typescript
interface OntologySource {
  name: string;
  canHandle(url: string): boolean;
  fetch(url: string): Promise<string>;
  parse(content: string): Promise<ParsedOntology>;
  extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]>;
  extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]>;
}
```

### 4. Ontology Extractor (`extractor.ts`)

Handles the extraction of entities and relationships from parsed ontology content.

**Features:**
- Content fetching from source
- Parsing using source-specific handlers
- Entity and relationship extraction
- Metadata generation

### 5. Ontology Merger (`merger.ts`)

Applies overrides and merges ontology data from multiple sources.

**Features:**
- Deep merging of entity properties
- Relationship override application
- Non-destructive merging with fallbacks
- Support for adding new entities/relationships

## Source Handlers

### OWL Source Handler (`sources/owl-source.ts`)

Handles OWL/RDF ontology formats with support for:
- FIBO (Financial Industry Business Ontology)
- O-CREAM ontologies
- Standard OWL/RDF formats

**Key Features:**
- XML parsing with xml2js
- Namespace-aware element extraction
- System class/property filtering
- URI-based name extraction
- Domain/range relationship extraction

**Supported URL Patterns:**
- URLs containing 'owl'
- URLs containing 'fibo'
- URLs containing 'o-cream'

## Configuration Examples

### Basic OWL Ontology Configuration

```typescript
const config: Config = {
  name: "Financial Ontology",
  source: {
    url: "https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/",
    type: "owl",
    version: "2024-01",
    description: "FIBO Financial Ontology"
  },
  extraction: {
    entities: {
      path: "fibo",
      name: "FIBO Entities",
      description: "Extract FIBO entities"
    },
    relationships: {
      path: "fibo",
      name: "FIBO Relationships", 
      description: "Extract FIBO relationships"
    }
  },
  overrides: {
    entities: {
      "FinancialInstrument": {
        keyProperties: ["instrumentId", "type"],
        vectorIndex: true
      }
    },
    relationships: {}
  },
  metadata: {
    lastExtraction: "2024-01-15T10:00:00Z",
    sourceVersion: "2024-01",
    localVersion: "1.0.0"
  }
};
```

### Entity Override Example

```typescript
const entityOverride = {
  "Organization": {
    properties: {
      industry: "string",
      size: "string",
      foundedYear: "number"
    },
    keyProperties: ["name", "industry"],
    vectorIndex: true,
    description: "Enhanced organization entity with industry classification"
  }
};
```

## Testing

The system includes comprehensive test coverage:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end processing tests
- **Real Source Tests**: Tests with actual ontology sources

### Running Tests

```bash
# Run all ontology script tests
npm test scripts/ontology

# Run specific test file
npm test scripts/ontology/__tests__/cli.test.ts
```

## Error Handling

The system provides robust error handling:

1. **Configuration Validation**: Validates all required fields and data types
2. **Source Discovery**: Graceful handling of unsupported sources
3. **Network Errors**: Proper error reporting for fetch failures
4. **Parsing Errors**: Fallback behavior for malformed content
5. **Merge Conflicts**: Non-destructive merging with conflict resolution

## Performance Considerations

- **Lazy Loading**: Sources are only instantiated when needed
- **Caching**: Parsed content can be cached for repeated processing
- **Streaming**: Large ontologies are processed incrementally
- **Memory Management**: Efficient data structures for large ontologies

## Extending the System

### Adding New Source Types

1. Implement the `OntologySource` interface
2. Add source detection logic in `canHandle()`
3. Implement format-specific parsing in `parse()`
4. Add extraction rules for entities and relationships
5. Register the source in the processor

### Example Custom Source

```typescript
export class CustomSource implements OntologySource {
  name = 'Custom Source';
  
  canHandle(url: string): boolean {
    return url.includes('custom-ontology');
  }
  
  async fetch(url: string): Promise<string> {
    // Custom fetching logic
  }
  
  async parse(content: string): Promise<ParsedOntology> {
    // Custom parsing logic
  }
  
  async extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]> {
    // Custom entity extraction
  }
  
  async extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]> {
    // Custom relationship extraction
  }
}
```

## Best Practices

1. **Configuration Validation**: Always validate configurations before processing
2. **Error Handling**: Implement proper error handling for all external calls
3. **Logging**: Use structured logging for debugging and monitoring
4. **Testing**: Write comprehensive tests for new source handlers
5. **Documentation**: Document custom extraction rules and overrides
6. **Versioning**: Maintain version compatibility for ontology sources

## Troubleshooting

### Common Issues

1. **Source Not Found**: Check URL patterns in `canHandle()` methods
2. **Parsing Errors**: Verify XML/JSON structure matches expected format
3. **Merge Conflicts**: Review override configurations for conflicts
4. **Performance Issues**: Consider caching for large ontologies

### Debug Mode

Enable debug logging to trace processing steps:

```typescript
const processor = new OntologyProcessor(sources);
const result = await processor.processOntology(config);
console.log('Processing result:', JSON.stringify(result, null, 2));
```

## Related Documentation

- [Ontology Integration Guide](../architecture/ontology-integration-summary.md)
- [Advanced Graph Processing](../architecture/advanced-graph.md)
- [Entity Extraction Guide](../features/enhanced-entity-extraction.md) 