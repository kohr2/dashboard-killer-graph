# Ontology-Driven Advanced Relationships

This document describes the implementation of ontology-driven advanced relationships in the knowledge graph system, where advanced relationship configurations are integrated directly into ontology JSON files.

## Overview

The ontology-driven advanced relationships system allows ontologies to define complex relationship patterns, similarity algorithms, hierarchical structures, and temporal analysis directly within their JSON configuration files. This provides a declarative way to specify how entities should be connected beyond simple direct relationships.

## Architecture

### Core Components

1. **OntologyDrivenAdvancedGraphService**: Main service that loads and applies advanced relationship configurations from ontology files
2. **AdvancedGraphService**: Generic service that implements the actual relationship creation algorithms
3. **Ontology JSON Configuration**: Extended ontology files that include `advancedRelationships` sections

### Integration with Ontologies

Advanced relationships are now integrated directly into ontology JSON files rather than being separate configuration files. This provides better cohesion and makes it easier to maintain ontology-specific relationship logic.

## Configuration Structure

### Ontology JSON Extension

Ontologies can now include an `advancedRelationships` section in their JSON configuration:

```json
{
  "name": "FinancialExtensionOntology",
  "entities": { ... },
  "relationships": { ... },
  "advancedRelationships": {
    "temporal": { ... },
    "hierarchical": { ... },
    "similarity": { ... },
    "complex": { ... },
    "queries": { ... }
  }
}
```

### Temporal Relationships

Temporal relationships track how entities interact over time:

```json
"temporal": {
  "enabled": true,
  "patterns": [
    {
      "name": "DEAL_TIMELINE",
      "description": "Track deal progression over time",
      "entityTypes": ["Deal", "Organization"],
      "relationshipType": "DEAL_PROGRESSION",
      "confidence": 0.9,
      "metadata": {
        "source": "deal_analysis",
        "patternType": "deal_timeline"
      }
    }
  ],
  "timeWindow": {
    "defaultDuration": 365,
    "maxDuration": 1825,
    "minDuration": 1
  }
}
```

### Hierarchical Relationships

Hierarchical relationships define parent-child structures:

```json
"hierarchical": {
  "enabled": true,
  "structures": [
    {
      "name": "FUND_PORTFOLIO_HIERARCHY",
      "description": "Fund to deal to target company hierarchy",
      "parentType": "Fund",
      "childType": "Deal",
      "relationshipType": "OWNS",
      "maxLevels": 3,
      "properties": {
        "hierarchyType": "investment_portfolio",
        "level": 1
      },
      "metadata": {
        "source": "portfolio_analysis",
        "confidence": 1.0
      }
    }
  ]
}
```

### Similarity Relationships

Similarity relationships identify entities with similar characteristics:

```json
"similarity": {
  "enabled": true,
  "algorithms": [
    {
      "name": "DEAL_SIMILARITY",
      "description": "Calculate similarity between deals based on multiple factors",
      "entityType": "Deal",
      "factors": [
        {
          "property": "sector",
          "weight": 0.4,
          "type": "categorical"
        },
        {
          "property": "dealSize",
          "weight": 0.3,
          "type": "numeric"
        }
      ],
      "threshold": 0.6,
      "metadata": {
        "algorithm": "weighted_property_similarity",
        "source": "deal_analysis"
      }
    }
  ]
}
```

### Complex Relationships

Complex relationships use custom Cypher queries to identify sophisticated patterns:

```json
"complex": {
  "enabled": true,
  "patterns": [
    {
      "name": "COMPETITIVE_RELATIONSHIP",
      "description": "Detect competitive relationships between organizations in same sector",
      "cypherQuery": "MATCH (org1:Organization)-[:INVOLVES]->(deal1:Deal) MATCH (org2:Organization)-[:INVOLVES]->(deal2:Deal) WHERE deal1 <> deal2 AND deal1.sector = deal2.sector AND org1 <> org2 RETURN org1.id as source, org2.id as target, deal1.sector as sector",
      "resultMapping": {
        "source": "source",
        "target": "target",
        "sector": "sector"
      },
      "confidence": 0.9,
      "enabled": true,
      "metadata": {
        "patternType": "competition_detection",
        "source": "market_analysis"
      }
    }
  ]
}
```

### Custom Queries

Custom queries provide ontology-specific analysis capabilities:

```json
"queries": {
  "timeline": {
    "enabled": true,
    "customQuery": "MATCH (entity)-[:CONTAINS_ENTITY]->(relatedEntity) MATCH (c:Communication)-[:CONTAINS_ENTITY]->(relatedEntity) WITH entity, collect({entity: relatedEntity.name, date: c.date, subject: c.subject}) as timeline ORDER BY c.date RETURN entity.name as entityName, timeline"
  },
  "hierarchy": {
    "enabled": true,
    "customQuery": "MATCH path = (fund:Fund)-[:OWNS*1..2]->(target:Organization) RETURN fund.name as fundName, [node in nodes(path)[1..-1] | node.name] as hierarchy, target.name as targetName"
  }
}
```

## Usage

### Loading Ontologies with Advanced Relationships

```typescript
import { OntologyDrivenAdvancedGraphService } from '@platform/ontology/ontology-driven-advanced-graph.service';

const service = container.resolve(OntologyDrivenAdvancedGraphService);
await service.initialize();

// Load ontology with advanced relationships
const ontologyPath = path.join(__dirname, 'ontologies', 'financial', 'ontology.json');
await service.loadOntology(ontologyPath);
```

### Executing Analysis

```typescript
// Execute temporal analysis
const temporalResults = await service.executeOntologyAnalysis(
  'FinancialExtensionOntology',
  'temporal',
  { limit: 50 }
);

// Execute similarity analysis
const similarityResults = await service.executeOntologyAnalysis(
  'FinancialExtensionOntology',
  'similarity',
  { threshold: 0.7, limit: 20 }
);

// Query specific patterns
const timelineResults = await service.queryOntologyPatterns(
  'FinancialExtensionOntology',
  'timeline',
  { limit: 10 }
);
```

### Getting Statistics

```typescript
const stats = await service.getOntologyStatistics();
console.log('Ontology Statistics:', stats);
```

## Implementation Details

### Service Architecture

The `OntologyDrivenAdvancedGraphService` works as follows:

1. **Initialization**: Sets up Neo4j connection and advanced graph service
2. **Ontology Loading**: Parses ontology JSON files and extracts advanced relationship configurations
3. **Configuration Application**: Applies each type of advanced relationship configuration:
   - Temporal: Analyzes timeline patterns and creates temporal relationships
   - Hierarchical: Builds hierarchical structures based on existing relationships
   - Similarity: Calculates entity similarities using weighted algorithms
   - Complex: Executes custom Cypher patterns to identify sophisticated relationships
4. **Query Execution**: Provides methods to query and analyze the created relationships

### Relationship Types

The system creates several types of Neo4j relationships:

- `TEMPORAL_RELATIONSHIP`: Tracks temporal patterns between entities
- `HIERARCHICAL_RELATIONSHIP`: Represents parent-child hierarchies
- `SIMILARITY_RELATIONSHIP`: Connects similar entities with similarity scores
- `COMPLEX_RELATIONSHIP`: Represents complex patterns identified by custom queries

### Metadata and Tracking

All advanced relationships include metadata for:
- Source ontology
- Confidence scores
- Creation timestamps
- Algorithm or pattern information
- Custom properties

## Benefits

### Declarative Configuration

Advanced relationships are defined declaratively in JSON, making them:
- Easy to understand and modify
- Version-controlled with the ontology
- Self-documenting
- Reusable across different contexts

### Ontology-Specific Logic

Each ontology can define its own:
- Similarity algorithms tailored to its domain
- Hierarchical structures relevant to its entities
- Temporal patterns specific to its use cases
- Complex patterns using domain-specific Cypher queries

### Extensibility

The system is designed to be extensible:
- New relationship types can be added
- Custom algorithms can be implemented
- Query patterns can be customized
- Metadata can be extended

## Best Practices

### Configuration Design

1. **Keep patterns focused**: Each pattern should have a clear, specific purpose
2. **Use meaningful names**: Pattern and algorithm names should be descriptive
3. **Set appropriate thresholds**: Balance between finding relationships and avoiding noise
4. **Include metadata**: Always include source and confidence information

### Performance Considerations

1. **Limit query complexity**: Keep Cypher queries efficient and well-indexed
2. **Use appropriate time windows**: Set reasonable durations for temporal analysis
3. **Batch processing**: Process relationships in batches for large datasets
4. **Monitor execution**: Track performance and adjust configurations as needed

### Maintenance

1. **Version ontologies**: Include version information in ontology configurations
2. **Document patterns**: Provide clear descriptions for all patterns and algorithms
3. **Test configurations**: Validate configurations before deployment
4. **Monitor results**: Track the quality and usefulness of created relationships

## Example: Financial Ontology

The financial ontology demonstrates a complete implementation with:

- **Temporal patterns**: Deal timeline tracking and investment cycles
- **Hierarchical structures**: Fund portfolio hierarchies and deal target relationships
- **Similarity algorithms**: Deal similarity based on sector, size, and type
- **Complex patterns**: Competitive relationships and sector concentration analysis
- **Custom queries**: Timeline analysis and hierarchical path queries

This provides a comprehensive example of how advanced relationships can be used to create a rich, interconnected knowledge graph for financial data analysis.

## Integration with Existing Systems

The ontology-driven advanced relationships system integrates seamlessly with:

- **Email Ingestion Pipeline**: Can apply advanced relationships during data ingestion
- **Reasoning System**: Provides additional relationship types for reasoning algorithms
- **Query APIs**: Exposes advanced relationship data through standard query interfaces
- **Visualization Tools**: Supports complex relationship visualization

## Future Enhancements

Potential future enhancements include:

1. **Machine Learning Integration**: Use ML models to improve similarity calculations
2. **Dynamic Configuration**: Allow runtime modification of relationship configurations
3. **Relationship Validation**: Add validation rules for relationship quality
4. **Performance Optimization**: Implement caching and optimization strategies
# Ontology-Driven Advanced Relationships

## Overview

The ontology-driven advanced relationships system allows you to configure and manage complex graph relationships directly in your `ontology.json` files. This approach provides a declarative, configuration-driven way to define how advanced relationships should be created and managed for each domain.

## Key Benefits

### 🎯 **Declarative Configuration**
- Define relationships in JSON configuration files
- No need to write custom code for each domain
- Easy to modify and extend without code changes

### 🔧 **Domain-Specific Customization**
- Each ontology can have its own relationship patterns
- Custom algorithms and thresholds per domain
- Flexible query customization

### 📊 **Centralized Management**
- All relationship logic in one place
- Version control for relationship configurations
- Easy to share and reuse patterns

### 🚀 **Automatic Execution**
- Relationships created automatically based on configuration
- Batch processing of multiple patterns
- Error handling and logging

## Configuration Structure

### Basic Ontology Structure

```json
{
  "name": "Financial Advanced Ontology",
  "version": "1.0.0",
  "description": "Financial ontology with advanced relationship configurations",
  "entities": {
    "Fund": {
      "properties": {
        "name": "string",
        "type": "string",
        "size": "number"
      }
    },
    "Deal": {
      "properties": {
        "name": "string",
        "dealSize": "number",
        "stage": "string"
      }
    }
  },
  "relationships": {
    "OWNS": {
      "from": "Fund",
      "to": "Deal",
      "properties": {
        "ownershipPercentage": "number"
      }
    }
  },
  "advancedRelationships": {
    // Advanced relationship configurations
  }
}
```

### Advanced Relationships Configuration

The `advancedRelationships` section contains configurations for all types of advanced relationships:

```json
{
  "advancedRelationships": {
    "temporal": {
      "enabled": true,
      "patterns": [...],
      "timeWindow": {...}
    },
    "hierarchical": {
      "enabled": true,
      "structures": [...]
    },
    "similarity": {
      "enabled": true,
      "algorithms": [...]
    },
    "complex": {
      "enabled": true,
      "patterns": [...]
    },
    "queries": {
      "timeline": {...},
      "hierarchy": {...},
      "similarity": {...},
      "complex": {...}
    }
  }
}
```

## Configuration Types

### 1. Temporal Relationships

Configure how temporal relationships are created based on timeline analysis:

```json
{
  "temporal": {
    "enabled": true,
    "patterns": [
      {
        "name": "DEAL_TIMELINE",
        "description": "Track deal progression over time",
        "entityTypes": ["Deal", "Organization"],
        "relationshipType": "DEAL_PROGRESSION",
        "confidence": 0.9,
        "metadata": {
          "source": "deal_analysis",
          "patternType": "deal_timeline"
        }
      }
    ],
    "timeWindow": {
      "defaultDuration": 365,
      "maxDuration": 1825,
      "minDuration": 1
    }
  }
}
```

**Pattern Properties:**
- `name`: Unique identifier for the pattern
- `description`: Human-readable description
- `entityTypes`: Array of entity types involved
- `relationshipType`: Type of temporal relationship to create
- `confidence`: Default confidence score (0-1)
- `metadata`: Additional metadata for the pattern

### 2. Hierarchical Relationships

Define hierarchical structures between entities:

```json
{
  "hierarchical": {
    "enabled": true,
    "structures": [
      {
        "name": "FUND_PORTFOLIO_HIERARCHY",
        "description": "Fund to deal to target company hierarchy",
        "parentType": "Fund",
        "childType": "Deal",
        "relationshipType": "OWNS",
        "maxLevels": 3,
        "properties": {
          "hierarchyType": "investment_portfolio",
          "level": 1
        },
        "metadata": {
          "source": "portfolio_analysis",
          "confidence": 1.0
        }
      }
    ]
  }
}
```

**Structure Properties:**
- `name`: Unique identifier for the structure
- `description`: Human-readable description
- `parentType`: Parent entity type
- `childType`: Child entity type
- `relationshipType`: Relationship type between parent and child
- `maxLevels`: Maximum hierarchy depth
- `properties`: Default properties for the hierarchy
- `metadata`: Additional metadata

### 3. Similarity Relationships

Configure similarity algorithms for entity comparison:

```json
{
  "similarity": {
    "enabled": true,
    "algorithms": [
      {
        "name": "DEAL_SIMILARITY",
        "description": "Calculate similarity between deals based on multiple factors",
        "entityType": "Deal",
        "factors": [
          {
            "property": "sector",
            "weight": 0.4,
            "type": "categorical"
          },
          {
            "property": "dealSize",
            "weight": 0.3,
            "type": "numeric"
          },
          {
            "property": "stage",
            "weight": 0.2,
            "type": "categorical"
          },
          {
            "property": "geography",
            "weight": 0.1,
            "type": "categorical"
          }
        ],
        "threshold": 0.6,
        "metadata": {
          "algorithm": "weighted_property_similarity",
          "source": "deal_analysis"
        }
      }
    ]
  }
}
```

**Algorithm Properties:**
- `name`: Unique identifier for the algorithm
- `description`: Human-readable description
- `entityType`: Entity type to analyze
- `factors`: Array of comparison factors
- `threshold`: Minimum similarity score to create relationship
- `metadata`: Additional metadata

**Factor Properties:**
- `property`: Property name to compare
- `weight`: Weight of this factor (0-1)
- `type`: Type of comparison (`exact`, `fuzzy`, `numeric`, `categorical`)

### 4. Complex Relationships

Define custom Cypher patterns for complex relationship detection:

```json
{
  "complex": {
    "enabled": true,
    "patterns": [
      {
        "name": "COMPETITIVE_RELATIONSHIP",
        "description": "Detect competitive relationships between organizations in same sector",
        "cypherQuery": "
          MATCH (org1:Organization)-[:INVOLVES]->(deal1:Deal)
          MATCH (org2:Organization)-[:INVOLVES]->(deal2:Deal)
          WHERE deal1 <> deal2 AND deal1.sector = deal2.sector
          AND org1 <> org2
          RETURN org1.id as source, org2.id as target, deal1.sector as sector
        ",
        "resultMapping": {
          "source": "source",
          "target": "target",
          "sector": "sector"
        },
        "confidence": 0.9,
        "enabled": true,
        "metadata": {
          "patternType": "competition_detection",
          "source": "market_analysis"
        }
      }
    ]
  }
}
```

**Pattern Properties:**
- `name`: Unique identifier for the pattern
- `description`: Human-readable description
- `cypherQuery`: Cypher query to detect the pattern
- `parameters`: Default parameters for the query
- `resultMapping`: Mapping of query results to relationship properties
- `confidence`: Default confidence score
- `enabled`: Whether this pattern is enabled
- `metadata`: Additional metadata

### 5. Custom Queries

Override default queries with domain-specific ones:

```json
{
  "queries": {
    "timeline": {
      "enabled": true,
      "customQuery": "
        MATCH (entity)-[:CONTAINS_ENTITY]->(relatedEntity)
        MATCH (c:Communication)-[:CONTAINS_ENTITY]->(relatedEntity)
        WITH entity, collect({entity: relatedEntity.name, date: c.date, subject: c.subject}) as timeline
        ORDER BY c.date
        RETURN entity.name as entityName, timeline
      "
    },
    "hierarchy": {
      "enabled": true,
      "customQuery": "
        MATCH path = (fund:Fund)-[:OWNS*1..2]->(target:Organization)
        RETURN fund.name as fundName, 
               [node in nodes(path)[1..-1] | node.name] as hierarchy,
               target.name as targetName
      "
    }
  }
}
```

## Usage Examples

### Loading Ontology Configuration

```typescript
import { OntologyDrivenAdvancedGraphService } from '@platform/ontology/ontology-driven-advanced-graph.service';

const ontologyService = container.resolve(OntologyDrivenAdvancedGraphService);
await ontologyService.initialize();

// Load single ontology
await ontologyService.loadOntology('./config/ontology/financial-advanced.ontology.json');

// Load multiple ontologies from directory
await ontologyService.loadOntologiesFromDirectory('./config/ontology/');
```

### Executing Ontology-Specific Analysis

```typescript
// Execute temporal analysis
const temporalResults = await ontologyService.executeOntologyAnalysis(
  'Financial Advanced Ontology',
  'temporal'
);

// Execute hierarchical analysis
const hierarchicalResults = await ontologyService.executeOntologyAnalysis(
  'Financial Advanced Ontology',
  'hierarchical'
);

// Execute similarity analysis
const similarityResults = await ontologyService.executeOntologyAnalysis(
  'Financial Advanced Ontology',
  'similarity'
);

// Execute complex analysis
const complexResults = await ontologyService.executeOntologyAnalysis(
  'Financial Advanced Ontology',
  'complex'
);
```

### Querying Ontology-Specific Patterns

```typescript
// Query using ontology-specific custom queries
const timelineResults = await ontologyService.queryOntologyPatterns(
  'Financial Advanced Ontology',
  'timeline'
);

const hierarchyResults = await ontologyService.queryOntologyPatterns(
  'Financial Advanced Ontology',
  'hierarchy'
);
```

### Getting Ontology Statistics

```typescript
const stats = await ontologyService.getOntologyStatistics();

for (const [ontologyName, ontologyStats] of Object.entries(stats)) {
  console.log(`Ontology: ${ontologyName}`);
  console.log(`  Temporal Patterns: ${ontologyStats.advancedRelationships.temporal.patterns}`);
  console.log(`  Hierarchical Structures: ${ontologyStats.advancedRelationships.hierarchical.structures}`);
  console.log(`  Similarity Algorithms: ${ontologyStats.advancedRelationships.similarity.algorithms}`);
  console.log(`  Complex Patterns: ${ontologyStats.advancedRelationships.complex.patterns}`);
}
```

## Integration with Existing Pipeline

### Email Ingestion Integration

```typescript
// In email-ingestion.service.ts
import { OntologyDrivenAdvancedGraphService } from '@platform/ontology/ontology-driven-advanced-graph.service';

export class EmailIngestionService {
  constructor(
    private ontologyAdvancedGraphService: OntologyDrivenAdvancedGraphService,
    // ... other dependencies
  ) {}

  async processEmail(emailData: EmailData): Promise<void> {
    // ... existing processing logic

    // Apply ontology-driven advanced relationships
    await this.applyOntologyAdvancedRelationships(entities);
  }

  private async applyOntologyAdvancedRelationships(entities: Entity[]): Promise<void> {
    const loadedOntologies = this.ontologyAdvancedGraphService.getLoadedOntologies();
    
    for (const ontologyName of loadedOntologies) {
      try {
        // Execute all types of analysis for this ontology
        await this.ontologyAdvancedGraphService.executeOntologyAnalysis(
          ontologyName,
          'temporal'
        );
        
        await this.ontologyAdvancedGraphService.executeOntologyAnalysis(
          ontologyName,
          'hierarchical'
        );
        
        await this.ontologyAdvancedGraphService.executeOntologyAnalysis(
          ontologyName,
          'similarity'
        );
        
        await this.ontologyAdvancedGraphService.executeOntologyAnalysis(
          ontologyName,
          'complex'
        );
      } catch (error) {
        logger.error(`Error applying advanced relationships for ontology ${ontologyName}:`, error);
      }
    }
  }
}
```

## Best Practices

### 1. **Organize Ontologies by Domain**
```
config/ontology/
├── financial-advanced.ontology.json
├── crm-advanced.ontology.json
├── procurement-advanced.ontology.json
└── security-advanced.ontology.json
```

### 2. **Use Descriptive Names**
```json
{
  "name": "Financial Advanced Ontology",
  "patterns": [
    {
      "name": "DEAL_TIMELINE_PROGRESSION",
      "description": "Track deal progression from initial contact to closing"
    }
  ]
}
```

### 3. **Set Appropriate Thresholds**
```json
{
  "similarity": {
    "algorithms": [
      {
        "threshold": 0.7,  // High threshold for strict similarity
        "factors": [
          { "property": "sector", "weight": 0.5 },
          { "property": "size", "weight": 0.3 },
          { "property": "geography", "weight": 0.2 }
        ]
      }
    ]
  }
}
```

### 4. **Include Comprehensive Metadata**
```json
{
  "metadata": {
    "source": "deal_analysis",
    "algorithm": "weighted_property_similarity",
    "version": "1.0.0",
    "author": "data_team",
    "lastUpdated": "2024-01-15"
  }
}
```

### 5. **Test Patterns Incrementally**
```json
{
  "complex": {
    "patterns": [
      {
        "name": "TEST_PATTERN",
        "enabled": false,  // Disable during testing
        "cypherQuery": "MATCH (n:Test) RETURN n.id as source, 'test' as target"
      }
    ]
  }
}
```

## Demo

Run the ontology-driven advanced graph demo:

```bash
npm run demo:ontology-advanced-graph
```

This demo showcases:
- Loading ontology configurations
- Executing ontology-specific analysis
- Querying custom patterns
- Getting ontology statistics
- Integration with existing pipeline

## Conclusion

The ontology-driven advanced relationships system provides a powerful, flexible way to configure complex graph relationships without writing custom code. By centralizing relationship logic in JSON configuration files, you can easily adapt the system to different domains and requirements while maintaining consistency and reusability. 