# Ontology Generation Strategy: JSON-First Approach

## Overview

This document outlines our strategy for generating TypeScript entities, repositories, and services from JSON ontology definitions. This approach ensures consistency, maintainability, and reduces manual coding errors.

## Current State

### Problems with Current Approach
- Manual TypeScript entity definitions scattered across multiple files
- Inconsistent schema definitions between JSON and TypeScript
- Duplicate code between ontologies
- Difficult to maintain large ontologies
- No single source of truth for entity schemas

### Benefits of JSON-First Strategy
- **Single Source of Truth**: All entity definitions live in JSON files
- **Consistency**: Generated code ensures schema alignment
- **Maintainability**: Changes to JSON automatically update TypeScript
- **Scalability**: Easy to add new ontologies and entities
- **Validation**: JSON schema validation prevents errors
- **Documentation**: JSON serves as living documentation

## Architecture

### Directory Structure
```
config/ontology/
├── core.ontology.json          # Core entities (Thing, Communication, etc.)
├── crm.ontology.json           # CRM-specific entities
├── financial.ontology.json     # Financial entities
└── procurement.ontology.json   # Procurement entities

codegen/
├── ontology-templates/         # Handlebars templates
│   ├── entity.hbs             # Entity class template
│   ├── repository.hbs         # Repository interface template
│   ├── service.hbs            # Service class template
│   └── dto.hbs                # DTO template
└── generated/                  # Generated TypeScript files
    ├── crm/
    ├── financial/
    └── procurement/
```

### JSON Schema Structure
```json
{
  "name": "OntologyName",
  "version": "1.0.0",
  "description": "Ontology description",
  "entities": {
    "EntityName": {
      "description": "Entity description",
      "parent": "ParentEntity",
      "properties": {
        "propertyName": {
          "type": "string|number|boolean|datetime|array|object",
          "description": "Property description",
          "required": true,
          "validation": {
            "minLength": 1,
            "maxLength": 255
          }
        }
      },
      "keyProperties": ["id", "name"],
      "vectorIndex": true,
      "enrichment": {
        "service": "serviceName",
        "properties": ["property1", "property2"]
      }
    }
  },
  "relationships": {
    "RELATIONSHIP_NAME": {
      "domain": "SourceEntity",
      "range": "TargetEntity",
      "description": "Relationship description",
      "properties": {
        "propertyName": {
          "type": "string",
          "description": "Property description"
        }
      }
    }
  }
}
```

## Generation Process

### 1. Template System (Handlebars)
We use Handlebars templates to generate TypeScript code:

**Entity Template (`entity.hbs`)**
```handlebars
import { BaseEntity } from '@shared/types/base-entity';

export interface {{entityName}} extends BaseEntity {
  {{#each properties}}
  {{@key}}: {{type}};
  {{/each}}
}

export class {{entityName}}Entity implements {{entityName}} {
  {{#each properties}}
  {{@key}}!: {{type}};
  {{/each}}

  constructor(data: Partial<{{entityName}}>) {
    Object.assign(this, data);
  }
}
```

**Repository Template (`repository.hbs`)**
```handlebars
import { {{entityName}} } from './{{entityName}}.entity';

export interface I{{entityName}}Repository {
  findById(id: string): Promise<{{entityName}} | null>;
  findAll(): Promise<{{entityName}}[]>;
  create(entity: {{entityName}}): Promise<{{entityName}}>;
  update(id: string, entity: Partial<{{entityName}}>): Promise<{{entityName}}>;
  delete(id: string): Promise<void>;
}
```

### 2. Generator Script
The generator script (`scripts/codegen/generate-ontologies.ts`) will:

1. **Scan JSON files**: Read all `.ontology.json` files
2. **Validate schemas**: Ensure JSON conforms to schema
3. **Generate entities**: Create TypeScript entity classes
4. **Generate repositories**: Create repository interfaces
5. **Generate services**: Create service classes
6. **Generate DTOs**: Create data transfer objects
7. **Update exports**: Update index files

### 3. Build Integration
```json
{
  "scripts": {
    "generate:ontologies": "ts-node scripts/codegen/generate-ontologies.ts",
    "build": "npm run generate:ontologies && tsc",
    "dev": "npm run generate:ontologies && ts-node-dev src/api.ts"
  }
}
```

## Migration Strategy

### Phase 1: Core Ontology (Week 1)
1. **Extract core entities** from existing TypeScript files
2. **Create `core.ontology.json`** with Thing, Communication, etc.
3. **Generate core entities** using templates
4. **Update imports** to use generated entities
5. **Test core functionality**

### Phase 2: CRM Ontology (Week 2)
1. **Extract CRM entities** (Contact, Organization, etc.)
2. **Create `crm.ontology.json`**
3. **Generate CRM entities and repositories**
4. **Update CRM services** to use generated code
5. **Test CRM functionality**

### Phase 3: Financial Ontology (Week 3)
1. **Extract financial entities** (Deal, Investor, etc.)
2. **Create `financial.ontology.json`**
3. **Generate financial entities and repositories**
4. **Update financial services**
5. **Test financial functionality**

### Phase 4: Procurement Ontology (Week 4)
1. **Extract procurement entities**
2. **Create `procurement.ontology.json`**
3. **Generate procurement entities and repositories**
4. **Update procurement services**
5. **Test procurement functionality**

### Phase 5: Cleanup (Week 5)
1. **Remove old TypeScript files**
2. **Update documentation**
3. **Performance testing**
4. **Final validation**

## Implementation Details

### Generator Script Structure
```typescript
// scripts/codegen/generate-ontologies.ts
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

interface OntologyGenerator {
  generateEntities(ontology: OntologyConfig): void;
  generateRepositories(ontology: OntologyConfig): void;
  generateServices(ontology: OntologyConfig): void;
  generateDTOs(ontology: OntologyConfig): void;
  updateIndexFiles(ontology: OntologyConfig): void;
}

class OntologyGeneratorImpl implements OntologyGenerator {
  // Implementation details...
}
```

### Template Customization
Templates support customization through:
- **Conditional logic**: Different code for different entity types
- **Helpers**: Custom Handlebars helpers for formatting
- **Partials**: Reusable template fragments
- **Context**: Entity-specific data passed to templates

### Validation
- **JSON Schema validation**: Ensure ontology files are valid
- **Type checking**: Generated TypeScript compiles correctly
- **Import validation**: All imports resolve correctly
- **Test generation**: Generate basic unit tests

## Benefits

### Development Benefits
- **Faster development**: Generate boilerplate automatically
- **Consistency**: All entities follow same patterns
- **Type safety**: Generated TypeScript ensures type safety
- **Documentation**: JSON serves as living documentation

### Maintenance Benefits
- **Single source of truth**: Changes in JSON propagate everywhere
- **Reduced bugs**: Less manual coding means fewer errors
- **Easier refactoring**: Change JSON, regenerate everything
- **Better testing**: Generated code is more predictable

### Scalability Benefits
- **Easy to add ontologies**: Just add JSON file and regenerate
- **Consistent patterns**: All ontologies follow same structure
- **Performance**: Generated code is optimized
- **Extensibility**: Easy to add new entity types

## Future Enhancements

### Advanced Features
- **GraphQL schema generation**: Generate GraphQL schemas from JSON
- **API documentation**: Generate OpenAPI specs from JSON
- **Database migrations**: Generate Neo4j schema from JSON
- **Validation rules**: Generate validation logic from JSON

### Tooling
- **IDE integration**: VSCode extension for JSON editing
- **Visual editor**: Web-based ontology editor
- **Version control**: Track ontology changes over time
- **Diff tool**: Compare ontology versions

### Performance
- **Incremental generation**: Only regenerate changed files
- **Caching**: Cache generated code for faster builds
- **Parallel processing**: Generate multiple ontologies in parallel
- **Optimization**: Optimize generated code for performance

## 2025-07 Enhancements – Importance-Driven Subset & Vector Index

To manage very large external ontologies (e.g. FIBO) the build tool now supports
importance-based trimming and smarter `vectorIndex` selection.

### Build-time flags
```
--top-entities <n>       Keep only the <n> highest-scoring classes
--top-relationships <n>  Keep only the <n> highest-scoring relationships
--include-external       Fetch owl:imports
```

### Heuristic scoring (used when LLM is offline)
| Factor | Impact |
|--------|--------|
| Ultra-priority keywords (fund, project, **bond**, buyer, claim…) | +0.40 ea (≤ 0.60) |
| Core business keywords (organization, contract, person…) | +0.15 ea (≤ 0.30) |
| **Context words** (taken from `config.source.description`) | +0.05 ea (≤ 0.20) |
| Single-word bonus | +0.05 |
| Composed-name penalty (Camel/Snake ≥2 words) | −0.07 per extra word (≤ −0.30) |
| Admin / descriptive keywords | −0.15 / −0.30 |
| Property count | +0.03 ea (≤ 0.15) |
| Description length | + up to 0.10 |

### `vectorIndex` rule
`vectorIndex = true` when the entity
1. has a `name` or `label` property **and**
2. (`score ≥ 0.8` **or** it matched at least one context word).

### Relationship pruning
After entities are filtered the builder removes any relationship whose `source`
or `target` class is not in the kept set and appends its name to
`ignoredRelationships`.

Resulting `source.ontology.json` contains:
```
entities[]             // kept (alphabetical)
relationships[]        // kept (alphabetical)
ignoredEntities[]      // dropped by rules
ignoredRelationships[] // dropped by rules or missing endpoint
```
These changes ensure common atomic concepts (Buyer, Bond, Claim…) remain in
smaller subsets while verbose helper classes are deprioritised.

## Conclusion

The JSON-first ontology generation strategy provides a robust foundation for maintaining large, complex ontologies. By centralizing entity definitions in JSON and generating TypeScript code automatically, we ensure consistency, maintainability, and scalability.

This approach aligns with our ontology-agnostic architecture principles and supports multiple data sources and formats. The migration can be done incrementally, ensuring minimal disruption to existing functionality. 