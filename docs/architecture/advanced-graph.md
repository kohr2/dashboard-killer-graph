# Advanced Graph Service

## Overview

The Advanced Graph Service provides ontology-agnostic capabilities for creating and analyzing complex relationships in the knowledge graph. It supports temporal relationships, hierarchical structures, similarity analysis, and pattern detection without being tied to specific domain ontologies.

## Key Features

### 🕒 **Temporal Relationships**
- Track relationships over time with start/end dates
- Calculate duration and confidence scores
- Support for any entity types and relationship types

### 🏗️ **Hierarchical Structures**
- Build multi-level hierarchies between any entity types
- Support for custom hierarchy types and properties
- Flexible level management

### 🔍 **Similarity Analysis**
- Calculate similarity between entities based on configurable factors
- Support for any entity type and similarity algorithm
- Configurable similarity thresholds

### 🎯 **Complex Pattern Detection**
- Define custom Cypher queries for pattern detection
- Support for complex relationship patterns
- Rich metadata and confidence scoring

### 📊 **Advanced Analytics**
- Timeline pattern analysis
- Custom graph analysis queries
- Comprehensive statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Advanced Graph Service                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Temporal      │  │  Hierarchical   │  │  Similarity  │ │
│  │ Relationships   │  │ Relationships   │  │ Relationships│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Complex       │  │   Pattern       │  │   Custom     │ │
│  │ Relationships   │  │   Analysis      │  │   Analytics  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Neo4j Database                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ TEMPORAL_       │  │ HIERARCHICAL_   │  │ SIMILARITY_  │ │
│  │ RELATIONSHIP    │  │ RELATIONSHIP    │  │ RELATIONSHIP │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ COMPLEX_        │  │ PATTERN_        │  │ Custom       │ │
│  │ RELATIONSHIP    │  │ RELATIONSHIP    │  │ Indexes      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### TemporalRelationship
```typescript
interface TemporalRelationship {
  source: string;
  target: string;
  type: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}
```

### HierarchicalRelationship
```typescript
interface HierarchicalRelationship {
  parent: string;
  child: string;
  level: number;
  hierarchyType: string;
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

### SimilarityRelationship
```typescript
interface SimilarityRelationship {
  entity1: string;
  entity2: string;
  similarityType: string;
  score: number;
  factors: string[];
  calculatedAt: Date;
  metadata?: Record<string, any>;
}
```

### ComplexRelationship
```typescript
interface ComplexRelationship {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  metadata: {
    source: string;
    confidence: number;
    createdAt: Date;
    lastUpdated: Date;
    algorithm?: string;
  };
}
```

### GraphPattern
```typescript
interface GraphPattern {
  name: string;
  description: string;
  cypherQuery: string;
  parameters?: Record<string, any>;
  resultMapping?: Record<string, string>;
}
```

## Usage Examples

### 1. Creating Temporal Relationships

```typescript
import { AdvancedGraphService } from '@platform/processing/advanced-graph.service';

const advancedGraphService = container.resolve(AdvancedGraphService);
await advancedGraphService.initialize();

const temporalRelationships: TemporalRelationship[] = [
  {
    source: 'org_123',
    target: 'org_456',
    type: 'PARTNERSHIP_FORMED',
    startDate: new Date('2023-01-15'),
    endDate: new Date('2023-12-31'),
    duration: 350,
    confidence: 0.9,
    metadata: {
      source: 'email_analysis',
      patternType: 'business_partnership',
    },
  },
];

await advancedGraphService.createTemporalRelationships(temporalRelationships);
```

### 2. Building Hierarchical Structures

```typescript
const hierarchicalRelationships: HierarchicalRelationship[] = [
  {
    parent: 'fund_001',
    child: 'deal_789',
    level: 1,
    hierarchyType: 'FUND_DEAL',
    properties: {
      ownershipPercentage: 75,
      investmentStage: 'Series A',
    },
    metadata: {
      source: 'deal_flow_analysis',
      confidence: 1.0,
    },
  },
];

await advancedGraphService.createHierarchicalRelationships(hierarchicalRelationships);
```

### 3. Calculating Entity Similarity

```typescript
const similarities = await advancedGraphService.calculateEntitySimilarity(
  'Organization',
  ['sector', 'size', 'geography']
);
```

### 4. Creating Complex Patterns

```typescript
const patternDefinitions: GraphPattern[] = [
  {
    name: 'COMPETITIVE_RELATIONSHIP',
    description: 'Organizations competing in the same sector',
    cypherQuery: `
      MATCH (org1:Organization)-[:INVOLVES]->(deal1:Deal)
      MATCH (org2:Organization)-[:INVOLVES]->(deal2:Deal)
      WHERE deal1 <> deal2 AND deal1.sector = deal2.sector
      AND org1 <> org2
      RETURN org1.id as source, org2.id as target, deal1.sector as sector
    `,
    resultMapping: {
      source: 'source',
      target: 'target',
      sector: 'sector',
    },
  },
];

const complexRelationships = await advancedGraphService.createComplexPatterns(patternDefinitions);
```

### 5. Analyzing Timeline Patterns

```typescript
const timelinePatterns = await advancedGraphService.analyzeTimelinePatterns(
  'org_123',
  'Organization'
);
```

### 6. Querying Advanced Patterns

```typescript
// Query different types of patterns
const patternTypes = ['timeline', 'hierarchy', 'similarity', 'complex', 'temporal', 'patterns'];

for (const patternType of patternTypes) {
  const results = await advancedGraphService.queryAdvancedPatterns(patternType);
  console.log(`${patternType}: ${results.length} results`);
}
```

### 7. Custom Analysis

```typescript
const customQuery = `
  MATCH (entity)-[r:TEMPORAL_RELATIONSHIP]->(target)
  WHERE r.confidence > 0.8
  RETURN entity.name as entityName, 
         target.name as targetName, 
         r.type as relationshipType,
         r.confidence as confidence
  ORDER BY r.confidence DESC
  LIMIT 5
`;

const customResults = await advancedGraphService.executeCustomAnalysis(customQuery);
```

### 8. Getting Graph Statistics

```typescript
const stats = await advancedGraphService.getGraphStatistics();
console.log('Graph Statistics:', stats);
```

## Database Schema

### Relationship Types

#### TEMPORAL_RELATIONSHIP
```cypher
CREATE INDEX temporal_relationships_start_date FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.startDate)
CREATE INDEX temporal_relationships_end_date FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.endDate)
CREATE INDEX temporal_relationships_type FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.type)
```

Properties:
- `startDate`: DateTime
- `endDate`: DateTime
- `duration`: Integer (days)
- `confidence`: Float
- `metadata`: Map
- `createdAt`: DateTime

#### HIERARCHICAL_RELATIONSHIP
```cypher
CREATE INDEX hierarchical_relationships_level FOR ()-[r:HIERARCHICAL_RELATIONSHIP]-() ON (r.level)
CREATE INDEX hierarchical_relationships_type FOR ()-[r:HIERARCHICAL_RELATIONSHIP]-() ON (r.hierarchyType)
```

Properties:
- `level`: Integer
- `hierarchyType`: String
- `properties`: Map
- `metadata`: Map
- `createdAt`: DateTime

#### SIMILARITY_RELATIONSHIP
```cypher
CREATE INDEX similarity_relationships_score FOR ()-[r:SIMILARITY_RELATIONSHIP]-() ON (r.score)
CREATE INDEX similarity_relationships_type FOR ()-[r:SIMILARITY_RELATIONSHIP]-() ON (r.similarityType)
```

Properties:
- `similarityType`: String
- `score`: Float
- `factors`: List<String>
- `metadata`: Map
- `calculatedAt`: DateTime

#### COMPLEX_RELATIONSHIP
```cypher
CREATE INDEX complex_relationships_confidence FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.confidence)
CREATE INDEX complex_relationships_source FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.source)
CREATE INDEX complex_relationships_type FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.type)
```

Properties:
- `type`: String
- `properties`: Map
- `confidence`: Float
- `source`: String
- `algorithm`: String
- `createdAt`: DateTime
- `lastUpdated`: DateTime

## Integration with Existing Pipeline

The Advanced Graph Service can be integrated into the existing email ingestion pipeline:

```typescript
// In email-ingestion.service.ts
import { AdvancedGraphService } from '@platform/processing/advanced-graph.service';

export class EmailIngestionService {
  constructor(
    private advancedGraphService: AdvancedGraphService,
    // ... other dependencies
  ) {}

  async processEmail(emailData: EmailData): Promise<void> {
    // ... existing processing logic

    // Add advanced graph analysis
    await this.analyzeAdvancedPatterns(entities);
  }

  private async analyzeAdvancedPatterns(entities: Entity[]): Promise<void> {
    // Create temporal relationships based on email dates
    const temporalRelationships = this.buildTemporalRelationships(entities);
    await this.advancedGraphService.createTemporalRelationships(temporalRelationships);

    // Calculate similarity between organizations
    const similarities = await this.advancedGraphService.calculateEntitySimilarity(
      'Organization',
      ['sector', 'size', 'geography']
    );
    await this.advancedGraphService.createSimilarityRelationships(similarities);

    // Create complex patterns
    const patterns = await this.advancedGraphService.createComplexPatterns([
      // Define custom patterns
    ]);
  }
}
```

## Performance Considerations

### Indexing Strategy
- All relationship types have appropriate indexes for common query patterns
- Composite indexes for frequently queried combinations
- Automatic index creation during service initialization

### Query Optimization
- Use parameterized queries to leverage query plan caching
- Batch operations for bulk relationship creation
- Connection pooling for efficient database access

### Memory Management
- Proper session cleanup after operations
- Streaming for large result sets
- Connection lifecycle management

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  await advancedGraphService.createTemporalRelationships(relationships);
} catch (error) {
  logger.error('Failed to create temporal relationships:', error);
  // Handle specific error types
  if (error.code === 'Neo.ClientError.Statement.SyntaxError') {
    // Handle Cypher syntax errors
  }
}
```

## Testing

The service includes comprehensive unit tests covering:

- Service initialization and cleanup
- All relationship creation methods
- Pattern analysis and querying
- Error handling scenarios
- Performance edge cases

Run tests with:
```bash
npm test src/platform/processing/__tests__/advanced-graph.service.test.ts
```

## Demo

Run the advanced graph demo to see all features in action:

```bash
npm run demo:advanced-graph
```

The demo showcases:
- Temporal relationship creation
- Hierarchical structure building
- Similarity analysis
- Complex pattern detection
- Advanced querying
- Custom analytics
- Graph statistics

## Future Enhancements

### Planned Features
- **Graph Algorithms**: Integration with Neo4j Graph Data Science library
- **Machine Learning**: Automated pattern discovery using ML models
- **Real-time Analysis**: Streaming graph analysis capabilities
- **Visualization**: Graph visualization and exploration tools
- **Performance Monitoring**: Advanced performance metrics and optimization

### Extensibility
- **Plugin System**: Support for custom relationship types and algorithms
- **Configuration Management**: Dynamic configuration for different use cases
- **Multi-tenancy**: Support for multiple graph instances
- **API Integration**: REST API for external access

## Conclusion

The Advanced Graph Service provides a powerful, ontology-agnostic foundation for complex graph analysis. Its flexible architecture supports any domain while maintaining high performance and reliability. The service integrates seamlessly with existing pipelines and provides comprehensive analytics capabilities for knowledge graph applications. 