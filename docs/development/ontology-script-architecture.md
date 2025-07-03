# Ontology Script Architecture Redesign

## Overview

The current ontology script has limitations in being truly ontology-agnostic and requires manual curation. This document outlines a new architecture that automatically extracts ontologies from their sources and allows for local customizations.

## Architecture Components

### 1. Configuration System (`config.json`)

Each ontology directory contains a `config.json` that defines:
- Source URL and type
- Extraction rules
- Local customizations
- Version tracking

```json
{
  "name": "financial",
  "source": {
    "url": "https://spec.edmcouncil.org/fibo/ontology",
    "type": "owl",
    "version": "2024.03",
    "description": "Financial Industry Business Ontology (FIBO)"
  },
  "extraction": {
    "entities": {
      "path": "//owl:Class[contains(@rdf:about, 'fibo')]",
      "name": "substring-after(@rdf:about, '#')",
      "description": "//rdfs:comment/text()",
      "properties": {
        "path": "//owl:DatatypeProperty[contains(@rdf:about, 'fibo')]",
        "name": "substring-after(@rdf:about, '#')",
        "type": "//rdfs:range/@rdf:resource"
      }
    },
    "relationships": {
      "path": "//owl:ObjectProperty[contains(@rdf:about, 'fibo')]",
      "name": "substring-after(@rdf:about, '#')",
      "description": "//rdfs:comment/text()",
      "domain": "//rdfs:domain/@rdf:resource",
      "range": "//rdfs:range/@rdf:resource"
    }
  },
  "overrides": {
    "entities": {
      "LegalEntity": {
        "properties": {
          "customField": {
            "type": "string",
            "description": "Custom field for local use"
          }
        }
      }
    },
    "relationships": {
      "hasCustomRelation": {
        "source": "LegalEntity",
        "target": "Organization",
        "description": "Custom relationship"
      }
    }
  },
  "metadata": {
    "lastExtraction": "2024-01-15T10:30:00Z",
    "sourceVersion": "2024.03",
    "localVersion": "1.2.0"
  }
}
```

### 2. File Structure

```
ontologies/
  financial/
    config.json              # Configuration and metadata
    source.ontology.json     # Auto-generated from source
    ontology.json           # Local overrides applied
    cache/
      fibo-2024.03.owl      # Cached source file
    __tests__/
      extraction.test.ts
      override.test.ts
      validation.test.ts
```

### 3. Core Classes

#### OntologySource
```typescript
interface OntologySource {
  name: string;
  canHandle(url: string): boolean;
  fetch(url: string): Promise<string>;
  parse(content: string): Promise<ParsedOntology>;
  extractEntities(config: ExtractionConfig): Promise<Entity[]>;
  extractRelationships(config: ExtractionConfig): Promise<Relationship[]>;
}
```

#### OntologyExtractor
```typescript
class OntologyExtractor {
  constructor(private source: OntologySource) {}
  
  async extract(config: Config): Promise<ExtractionResult> {
    const content = await this.source.fetch(config.source.url);
    const parsed = await this.source.parse(content);
    const entities = await this.source.extractEntities(config.extraction.entities);
    const relationships = await this.source.extractRelationships(config.extraction.relationships);
    
    return { entities, relationships, metadata: this.generateMetadata(config) };
  }
}
```

#### OntologyMerger
```typescript
class OntologyMerger {
  async merge(sourceOntology: Ontology, overrides: OverrideConfig): Promise<Ontology> {
    const merged = { ...sourceOntology };
    
    // Apply entity overrides
    for (const [entityName, override] of Object.entries(overrides.entities || {})) {
      if (merged.entities[entityName]) {
        merged.entities[entityName] = this.mergeEntity(
          merged.entities[entityName], 
          override
        );
      } else {
        merged.entities[entityName] = override;
      }
    }
    
    // Apply relationship overrides
    for (const [relName, override] of Object.entries(overrides.relationships || {})) {
      if (merged.relationships[relName]) {
        merged.relationships[relName] = this.mergeRelationship(
          merged.relationships[relName], 
          override
        );
      } else {
        merged.relationships[relName] = override;
      }
    }
    
    return merged;
  }
}
```

### 4. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create Config interface and validation
- [ ] Implement OntologySource interface
- [ ] Build OWL source handler
- [ ] Create basic extraction engine
- [ ] Add caching system

#### Phase 2: Extraction Engine (Week 3-4)
- [ ] Implement XPath-based extraction
- [ ] Add JSONPath support for JSON ontologies
- [ ] Create entity/relationship parsers
- [ ] Add metadata generation
- [ ] Implement source.ontology.json generation

#### Phase 3: Override System (Week 5-6)
- [ ] Build OntologyMerger class
- [ ] Implement deep merge logic
- [ ] Add validation for overrides
- [ ] Create diff reporting
- [ ] Add conflict resolution

#### Phase 4: CLI and Testing (Week 7-8)
- [ ] Create CLI commands
- [ ] Add comprehensive tests
- [ ] Create migration tools
- [ ] Add validation scripts
- [ ] Performance optimization

### 5. CLI Commands

```bash
# Extract ontology from source
npm run ontology:extract -- --ontology financial

# Apply overrides to create final ontology
npm run ontology:merge -- --ontology financial

# Validate ontology structure
npm run ontology:validate -- --ontology financial

# Show differences between source and local
npm run ontology:diff -- --ontology financial

# Update from source (if source changed)
npm run ontology:update -- --ontology financial

# Create new ontology from template
npm run ontology:create -- --name procurement --source https://example.com/ontology
```

### 6. Testing Strategy

#### Unit Tests
- Config validation
- Source parsing
- Entity extraction
- Relationship extraction
- Override merging

#### Integration Tests
- Full extraction pipeline
- Real ontology sources (FIBO, O-CREAM)
- Override application
- File generation

#### Performance Tests
- Large ontology handling
- Caching effectiveness
- Memory usage optimization

### 7. Migration Strategy

1. **Parallel Development**: Build new system alongside existing
2. **Gradual Migration**: Start with one ontology (financial/FIBO)
3. **Validation**: Ensure extracted data matches current curated data
4. **Rollout**: Migrate remaining ontologies
5. **Cleanup**: Remove old script and manual curation

### 8. Benefits

- **Automation**: No manual curation required
- **Accuracy**: Direct from source, no transcription errors
- **Maintainability**: Clear separation of source and local customizations
- **Scalability**: Easy to add new ontology sources
- **Version Control**: Track changes between source and local
- **Testing**: Each component can be tested independently

### 9. Future Enhancements

- Support for more ontology formats (RDF, JSON-LD, Turtle)
- Automatic relationship inference
- Ontology validation against schemas
- Integration with ontology repositories
- Visual diff tools
- Automated testing of ontology consistency 