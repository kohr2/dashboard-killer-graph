import { Session } from 'neo4j-driver';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

export interface TemporalRelationship {
  source: string;
  target: string;
  type: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number; // in days
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface HierarchicalRelationship {
  parent: string;
  child: string;
  level: number;
  hierarchyType: string; // Generic type
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SimilarityRelationship {
  entity1: string;
  entity2: string;
  similarityType: string; // Generic type
  score: number;
  factors: string[];
  calculatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ComplexRelationship {
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

export interface GraphPattern {
  name: string;
  description: string;
  cypherQuery: string;
  parameters?: Record<string, any>;
  resultMapping?: Record<string, string>;
}

export class AdvancedGraphService {
  private neo4jConnection: Neo4jConnection;
  private session: Session | null = null;

  constructor(neo4jConnection: Neo4jConnection = new Neo4jConnection()) {
    this.neo4jConnection = neo4jConnection;
  }

  async initialize(): Promise<void> {
    await this.neo4jConnection.connect();
    this.session = this.neo4jConnection.getDriver().session();
    
    if (!this.session) {
      throw new Error('Failed to create Neo4j session for advanced graph operations.');
    }

    // Create generic indexes for advanced graph operations
    await this.createAdvancedIndexes();
  }

  private async createAdvancedIndexes(): Promise<void> {
    const indexes = [
      // Generic temporal relationships
      'CREATE INDEX temporal_relationships_start_date IF NOT EXISTS FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.startDate)',
      'CREATE INDEX temporal_relationships_end_date IF NOT EXISTS FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.endDate)',
      'CREATE INDEX temporal_relationships_type IF NOT EXISTS FOR ()-[r:TEMPORAL_RELATIONSHIP]-() ON (r.type)',
      
      // Generic hierarchical relationships
      'CREATE INDEX hierarchical_relationships_level IF NOT EXISTS FOR ()-[r:HIERARCHICAL_RELATIONSHIP]-() ON (r.level)',
      'CREATE INDEX hierarchical_relationships_type IF NOT EXISTS FOR ()-[r:HIERARCHICAL_RELATIONSHIP]-() ON (r.hierarchyType)',
      
      // Generic similarity relationships
      'CREATE INDEX similarity_relationships_score IF NOT EXISTS FOR ()-[r:SIMILARITY_RELATIONSHIP]-() ON (r.score)',
      'CREATE INDEX similarity_relationships_type IF NOT EXISTS FOR ()-[r:SIMILARITY_RELATIONSHIP]-() ON (r.similarityType)',
      
      // Generic complex relationships
      'CREATE INDEX complex_relationships_confidence IF NOT EXISTS FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.confidence)',
      'CREATE INDEX complex_relationships_source IF NOT EXISTS FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.source)',
      'CREATE INDEX complex_relationships_type IF NOT EXISTS FOR ()-[r:COMPLEX_RELATIONSHIP]-() ON (r.type)',
      
      // Generic pattern relationships
      'CREATE INDEX pattern_relationships_type IF NOT EXISTS FOR ()-[r:PATTERN_RELATIONSHIP]-() ON (r.patternType)',
      'CREATE INDEX pattern_relationships_confidence IF NOT EXISTS FOR ()-[r:PATTERN_RELATIONSHIP]-() ON (r.confidence)',
    ];

    for (const indexQuery of indexes) {
      try {
        await this.session!.run(indexQuery);
        logger.info(`Created advanced graph index: ${indexQuery.split(' ')[2]}`);
      } catch (error) {
        logger.warn(`Index might already exist: ${indexQuery.split(' ')[2]}`);
      }
    }
  }

  /**
   * Create temporal relationships with timeline tracking (ontology agnostic)
   */
  async createTemporalRelationships(relationships: TemporalRelationship[]): Promise<void> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    for (const rel of relationships) {
      const query = `
        MATCH (a {id: $sourceId})
        MATCH (b {id: $targetId})
        MERGE (a)-[r:TEMPORAL_RELATIONSHIP {type: $type}]->(b)
        SET r.startDate = datetime($startDate),
            r.endDate = datetime($endDate),
            r.duration = $duration,
            r.confidence = $confidence,
            r.metadata = $metadata,
            r.createdAt = datetime()
        RETURN r
      `;

      await this.session.run(query, {
        sourceId: rel.source,
        targetId: rel.target,
        type: rel.type,
        startDate: rel.startDate?.toISOString(),
        endDate: rel.endDate?.toISOString(),
        duration: rel.duration,
        confidence: rel.confidence || 1.0,
        metadata: rel.metadata || {},
      });
    }

    logger.info(`Created ${relationships.length} temporal relationships`);
  }

  /**
   * Create hierarchical relationships (ontology agnostic)
   */
  async createHierarchicalRelationships(relationships: HierarchicalRelationship[]): Promise<void> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    for (const rel of relationships) {
      const query = `
        MATCH (parent {id: $parentId})
        MATCH (child {id: $childId})
        MERGE (parent)-[r:HIERARCHICAL_RELATIONSHIP]->(child)
        SET r.level = $level,
            r.hierarchyType = $hierarchyType,
            r.properties = $properties,
            r.metadata = $metadata,
            r.createdAt = datetime()
        RETURN r
      `;

      await this.session.run(query, {
        parentId: rel.parent,
        childId: rel.child,
        level: rel.level,
        hierarchyType: rel.hierarchyType,
        properties: rel.properties || {},
        metadata: rel.metadata || {},
      });
    }

    logger.info(`Created ${relationships.length} hierarchical relationships`);
  }

  /**
   * Create similarity relationships between entities (ontology agnostic)
   */
  async createSimilarityRelationships(relationships: SimilarityRelationship[]): Promise<void> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    for (const rel of relationships) {
      const query = `
        MATCH (entity1 {id: $entity1Id})
        MATCH (entity2 {id: $entity2Id})
        MERGE (entity1)-[r:SIMILARITY_RELATIONSHIP]->(entity2)
        SET r.similarityType = $similarityType,
            r.score = $score,
            r.factors = $factors,
            r.metadata = $metadata,
            r.calculatedAt = datetime()
        RETURN r
      `;

      await this.session.run(query, {
        entity1Id: rel.entity1,
        entity2Id: rel.entity2,
        similarityType: rel.similarityType,
        score: rel.score,
        factors: rel.factors,
        metadata: rel.metadata || {},
      });
    }

    logger.info(`Created ${relationships.length} similarity relationships`);
  }

  /**
   * Create complex relationships with rich metadata (ontology agnostic)
   */
  async createComplexRelationships(relationships: ComplexRelationship[]): Promise<void> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    for (const rel of relationships) {
      const query = `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        MERGE (source)-[r:COMPLEX_RELATIONSHIP {type: $type}]->(target)
        SET r += $properties,
            r.confidence = $confidence,
            r.source = $source,
            r.algorithm = $algorithm,
            r.createdAt = datetime(),
            r.lastUpdated = datetime()
        RETURN r
      `;

      await this.session.run(query, {
        sourceId: rel.source,
        targetId: rel.target,
        type: rel.type,
        properties: rel.properties,
        confidence: rel.metadata.confidence,
        source: rel.metadata.source,
        algorithm: rel.metadata.algorithm,
      });
    }

    logger.info(`Created ${relationships.length} complex relationships`);
  }

  /**
   * Analyze timeline patterns for any entity type
   */
  async analyzeTimelinePatterns(entityId: string, entityType?: string): Promise<TemporalRelationship[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const query = `
      MATCH (entity {id: $entityId})
      ${entityType ? `WHERE entity:$entityType` : ''}
      MATCH (entity)-[:CONTAINS_ENTITY]->(relatedEntity)
      MATCH (c:Communication)-[:CONTAINS_ENTITY]->(relatedEntity)
      WITH entity, relatedEntity, c
      ORDER BY c.date
      RETURN entity.id as entityId, relatedEntity.id as relatedEntityId, c.date as date, c.subject as subject
      ORDER BY c.date
    `;

    const result = await this.session.run(query, { entityId, entityType });
    const timeline: TemporalRelationship[] = [];

    let previousEntity: string | null = null;
    let previousDate: Date | null = null;

    for (const record of result.records) {
      const relatedEntityId = record.get('relatedEntityId');
      const date = new Date(record.get('date'));

      if (previousEntity && previousDate) {
        const duration = Math.floor((date.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        
        timeline.push({
          source: previousEntity,
          target: relatedEntityId,
          type: 'TIMELINE_SEQUENCE',
          startDate: previousDate,
          endDate: date,
          duration,
          confidence: 0.8,
          metadata: {
            patternType: 'temporal_sequence',
            sourceEntity: entityId,
          },
        });
      }

      previousEntity = relatedEntityId;
      previousDate = date;
    }

    return timeline;
  }

  /**
   * Build hierarchical structure for any entity types
   */
  async buildHierarchicalStructure(parentType: string, childType: string, relationshipType: string): Promise<HierarchicalRelationship[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const query = `
      MATCH (parent:$parentType)
      MATCH (child:$childType)
      WHERE (parent)-[:$relationshipType]->(child)
      RETURN parent.id as parentId, child.id as childId
    `;

    const result = await this.session.run(query, { parentType, childType, relationshipType });
    const hierarchy: HierarchicalRelationship[] = [];

    for (const record of result.records) {
      hierarchy.push({
        parent: record.get('parentId'),
        child: record.get('childId'),
        level: 1,
        hierarchyType: `${parentType}_${childType}`,
        properties: {
          relationshipType,
        },
        metadata: {
          source: 'hierarchy_analysis',
          confidence: 1.0,
        },
      });
    }

    return hierarchy;
  }

  /**
   * Calculate similarity between entities based on generic properties
   */
  async calculateEntitySimilarity(entityType: string, similarityFactors: string[]): Promise<SimilarityRelationship[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    // Build dynamic similarity query based on factors
    const factorConditions = similarityFactors.map(factor => {
      return `CASE WHEN entity1.$factor = entity2.$factor THEN 0.${Math.floor(100 / similarityFactors.length)} ELSE 0 END as ${factor}Score`;
    }).join(',\n           ');

    const query = `
      MATCH (entity1:$entityType), (entity2:$entityType)
      WHERE entity1 <> entity2 AND NOT (entity1)-[:SIMILARITY_RELATIONSHIP]->(entity2)
      WITH entity1, entity2,
           ${factorConditions}
      WITH entity1, entity2, ${similarityFactors.map(f => `${f}Score`).join(' + ')} as totalScore
      WHERE totalScore > 0.5
      RETURN entity1.id as entity1Id, entity2.id as entity2Id, totalScore
    `;

    const result = await this.session.run(query, { entityType });
    const similarities: SimilarityRelationship[] = [];

    for (const record of result.records) {
      similarities.push({
        entity1: record.get('entity1Id'),
        entity2: record.get('entity2Id'),
        similarityType: `${entityType}_SIMILARITY`,
        score: record.get('totalScore'),
        factors: similarityFactors,
        calculatedAt: new Date(),
        metadata: {
          algorithm: 'property_based_similarity',
          entityType,
        },
      });
    }

    return similarities;
  }

  /**
   * Create complex relationship patterns (ontology agnostic)
   */
  async createComplexPatterns(patternDefinitions: GraphPattern[]): Promise<ComplexRelationship[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const patterns: ComplexRelationship[] = [];

    for (const pattern of patternDefinitions) {
      try {
        const result = await this.session.run(pattern.cypherQuery, pattern.parameters || {});
        
        for (const record of result.records) {
          const mappedResult = this.mapPatternResult(record, pattern.resultMapping);
          
          patterns.push({
            source: mappedResult.source,
            target: mappedResult.target,
            type: pattern.name,
            properties: {
              patternName: pattern.name,
              description: pattern.description,
              ...mappedResult.properties,
            },
            metadata: {
              source: 'pattern_analysis',
              confidence: mappedResult.confidence || 0.8,
              createdAt: new Date(),
              lastUpdated: new Date(),
              algorithm: pattern.name,
            },
          });
        }
      } catch (error) {
        logger.error(`Error executing pattern ${pattern.name}:`, error);
      }
    }

    return patterns;
  }

  private mapPatternResult(record: any, mapping?: Record<string, string>): any {
    if (!mapping) {
      return record.toObject();
    }

    const mapped: any = {};
    for (const [key, value] of Object.entries(mapping)) {
      mapped[key] = record.get(value);
    }
    return mapped;
  }

  /**
   * Query advanced graph patterns (ontology agnostic)
   */
  async queryAdvancedPatterns(patternType: string, parameters?: Record<string, any>): Promise<any[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const queries: Record<string, string> = {
      timeline: `
        MATCH (entity)-[:CONTAINS_ENTITY]->(relatedEntity)
        MATCH (c:Communication)-[:CONTAINS_ENTITY]->(relatedEntity)
        WITH entity, collect({entity: relatedEntity.name, date: c.date, subject: c.subject}) as timeline
        ORDER BY c.date
        RETURN entity.name as entityName, timeline
      `,
      
      hierarchy: `
        MATCH path = (parent)-[:HIERARCHICAL_RELATIONSHIP*1..3]->(child)
        RETURN parent.name as parentName, 
               [node in nodes(path)[1..-1] | node.name] as hierarchy,
               child.name as childName
      `,
      
      similarity: `
        MATCH (entity1)-[r:SIMILARITY_RELATIONSHIP]->(entity2)
        WHERE r.score > 0.7
        RETURN entity1.name as entity1Name, 
               entity2.name as entity2Name, 
               r.score as similarity,
               r.similarityType as type
        ORDER BY r.score DESC
      `,
      
      complex: `
        MATCH (source)-[r:COMPLEX_RELATIONSHIP]->(target)
        WHERE r.confidence > 0.8
        RETURN source.name as sourceName,
               target.name as targetName,
               r.type as relationshipType,
               r.confidence as confidence,
               r.properties as properties
        ORDER BY r.confidence DESC
      `,
      
      temporal: `
        MATCH (source)-[r:TEMPORAL_RELATIONSHIP]->(target)
        WHERE r.startDate IS NOT NULL
        RETURN source.name as sourceName,
               target.name as targetName,
               r.type as relationshipType,
               r.startDate as startDate,
               r.endDate as endDate,
               r.duration as duration
        ORDER BY r.startDate
      `,
      
      patterns: `
        MATCH (source)-[r:COMPLEX_RELATIONSHIP]->(target)
        WHERE r.properties.patternName IS NOT NULL
        RETURN source.name as sourceName,
               target.name as targetName,
               r.properties.patternName as patternName,
               r.properties.description as description,
               r.confidence as confidence
        ORDER BY r.confidence DESC
      `
    };

    const query = queries[patternType];
    if (!query) {
      throw new Error(`Unknown pattern type: ${patternType}`);
    }

    const result = await this.session.run(query, parameters || {});
    return result.records.map(record => record.toObject());
  }

  /**
   * Execute custom graph analysis query
   */
  async executeCustomAnalysis(query: string, parameters?: Record<string, any>): Promise<any[]> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const result = await this.session.run(query, parameters || {});
    return result.records.map(record => record.toObject());
  }

  /**
   * Get graph statistics
   */
  async getGraphStatistics(): Promise<Record<string, any>> {
    if (!this.session) throw new Error('Neo4j session not initialized');

    const stats = {
      temporalRelationships: 0,
      hierarchicalRelationships: 0,
      similarityRelationships: 0,
      complexRelationships: 0,
      totalNodes: 0,
      totalRelationships: 0,
    };

    const queries = [
      'MATCH ()-[r:TEMPORAL_RELATIONSHIP]->() RETURN count(r) as count',
      'MATCH ()-[r:HIERARCHICAL_RELATIONSHIP]->() RETURN count(r) as count',
      'MATCH ()-[r:SIMILARITY_RELATIONSHIP]->() RETURN count(r) as count',
      'MATCH ()-[r:COMPLEX_RELATIONSHIP]->() RETURN count(r) as count',
      'MATCH (n) RETURN count(n) as count',
      'MATCH ()-[r]->() RETURN count(r) as count',
    ];

    const statNames = [
      'temporalRelationships',
      'hierarchicalRelationships', 
      'similarityRelationships',
      'complexRelationships',
      'totalNodes',
      'totalRelationships',
    ];

    for (let i = 0; i < queries.length; i++) {
      const result = await this.session.run(queries[i]);
      stats[statNames[i] as keyof typeof stats] = result.records[0].get('count').toNumber();
    }

    return stats;
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
      logger.info('Advanced graph service session closed.');
    }
    await this.neo4jConnection.close();
  }
} 