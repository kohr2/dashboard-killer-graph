import { Session } from 'neo4j-driver';
import { singleton } from 'tsyringe';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';
import { AdvancedGraphService, TemporalRelationship, HierarchicalRelationship, SimilarityRelationship, ComplexRelationship, GraphPattern } from './advanced-graph.service';
import * as fs from 'fs';
import * as path from 'path';

export interface AdvancedRelationshipsConfig {
  temporal?: {
    enabled: boolean;
    patterns: Array<{
      name: string;
      description: string;
      entityTypes: string[];
      relationshipType: string;
      confidence: number;
      metadata?: Record<string, any>;
    }>;
    timeWindow?: {
      defaultDuration?: number;
      maxDuration?: number;
      minDuration?: number;
    };
  };
  hierarchical?: {
    enabled: boolean;
    structures: Array<{
      name: string;
      description: string;
      parentType: string;
      childType: string;
      relationshipType: string;
      maxLevels: number;
      properties?: Record<string, any>;
      metadata?: Record<string, any>;
    }>;
  };
  similarity?: {
    enabled: boolean;
    algorithms: Array<{
      name: string;
      description: string;
      entityType: string;
      factors: Array<{
        property: string;
        weight: number;
        type: 'exact' | 'fuzzy' | 'numeric' | 'categorical';
      }>;
      threshold: number;
      metadata?: Record<string, any>;
    }>;
  };
  complex?: {
    enabled: boolean;
    patterns: Array<{
      name: string;
      description: string;
      cypherQuery: string;
      parameters?: Record<string, any>;
      resultMapping?: Record<string, string>;
      confidence: number;
      enabled: boolean;
      metadata?: Record<string, any>;
    }>;
  };
  queries?: {
    timeline?: {
      enabled: boolean;
      customQuery?: string;
    };
    hierarchy?: {
      enabled: boolean;
      customQuery?: string;
    };
    similarity?: {
      enabled: boolean;
      customQuery?: string;
    };
    complex?: {
      enabled: boolean;
      customQuery?: string;
    };
  };
}

export interface OntologyAdvancedConfig {
  name: string;
  version: string;
  description: string;
  entities: Record<string, any>;
  relationships: Record<string, any>;
  advancedRelationships: AdvancedRelationshipsConfig;
}

@singleton()
export class OntologyDrivenAdvancedGraphService {
  private advancedGraphService: AdvancedGraphService;
  private neo4jConnection: Neo4jConnection;
  private session: Session | null = null;
  private ontologies: Map<string, OntologyAdvancedConfig> = new Map();

  constructor() {
    this.advancedGraphService = container.resolve(AdvancedGraphService);
    this.neo4jConnection = container.resolve(Neo4jConnection);
  }

  async initialize(): Promise<void> {
    await this.advancedGraphService.initialize();
    await this.neo4jConnection.connect();
    this.session = this.neo4jConnection.getDriver().session();
    
    if (!this.session) {
      throw new Error('Failed to create Neo4j session for ontology-driven advanced graph operations.');
    }

    logger.info('Ontology-driven advanced graph service initialized');
  }

  /**
   * Load ontology configuration from JSON file
   */
  async loadOntology(ontologyPath: string): Promise<void> {
    try {
      const fullPath = path.resolve(ontologyPath);
      const ontologyData = fs.readFileSync(fullPath, 'utf8');
      const ontology: OntologyAdvancedConfig = JSON.parse(ontologyData);
      
      this.ontologies.set(ontology.name, ontology);
      logger.info(`Loaded ontology: ${ontology.name} v${ontology.version}`);
      
      // Apply ontology configuration
      await this.applyOntologyConfiguration(ontology);
    } catch (error) {
      logger.error(`Failed to load ontology from ${ontologyPath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple ontologies from directory
   */
  async loadOntologiesFromDirectory(directoryPath: string): Promise<void> {
    try {
      const fullPath = path.resolve(directoryPath);
      const files = fs.readdirSync(fullPath);
      
      for (const file of files) {
        if (file.endsWith('.ontology.json')) {
          const ontologyPath = path.join(fullPath, file);
          await this.loadOntology(ontologyPath);
        }
      }
      
      logger.info(`Loaded ${this.ontologies.size} ontologies from ${directoryPath}`);
    } catch (error) {
      logger.error(`Failed to load ontologies from directory ${directoryPath}:`, error);
      throw error;
    }
  }

  /**
   * Apply ontology configuration to create advanced relationships
   */
  private async applyOntologyConfiguration(ontology: OntologyAdvancedConfig): Promise<void> {
    const { advancedRelationships } = ontology;
    
    // Apply temporal relationships
    if (advancedRelationships.temporal?.enabled) {
      await this.applyTemporalConfiguration(ontology.name, advancedRelationships.temporal);
    }

    // Apply hierarchical relationships
    if (advancedRelationships.hierarchical?.enabled) {
      await this.applyHierarchicalConfiguration(ontology.name, advancedRelationships.hierarchical);
    }

    // Apply similarity relationships
    if (advancedRelationships.similarity?.enabled) {
      await this.applySimilarityConfiguration(ontology.name, advancedRelationships.similarity);
    }

    // Apply complex relationships
    if (advancedRelationships.complex?.enabled) {
      await this.applyComplexConfiguration(ontology.name, advancedRelationships.complex);
    }
  }

  /**
   * Apply temporal relationship configuration
   */
  private async applyTemporalConfiguration(ontologyName: string, config: any): Promise<void> {
    logger.info(`Applying temporal configuration for ontology: ${ontologyName}`);
    
    for (const pattern of config.patterns) {
      try {
        // Analyze timeline patterns for each entity type
        const entities = await this.getEntitiesByType(pattern.entityTypes[0]);
        
        for (const entity of entities) {
          const timelinePatterns = await this.advancedGraphService.analyzeTimelinePatterns(
            entity.id,
            pattern.entityTypes[0]
          );
          
          // Create temporal relationships based on patterns
          const temporalRelationships = timelinePatterns.map(temporalPattern => ({
            source: temporalPattern.source,
            target: temporalPattern.target,
            type: pattern.relationshipType,
            startDate: temporalPattern.startDate,
            endDate: temporalPattern.endDate,
            duration: temporalPattern.duration,
            confidence: pattern.confidence,
            metadata: {
              ...temporalPattern.metadata,
              ontology: ontologyName,
              patternName: pattern.name
            }
          }));
          
          if (temporalRelationships.length > 0) {
            await this.advancedGraphService.createTemporalRelationships(temporalRelationships);
          }
        }
        
        logger.info(`Applied temporal pattern: ${pattern.name} for ${entities.length} entities`);
      } catch (error) {
        logger.error(`Failed to apply temporal pattern ${pattern.name}:`, error);
      }
    }
  }

  /**
   * Apply hierarchical relationship configuration
   */
  private async applyHierarchicalConfiguration(ontologyName: string, config: any): Promise<void> {
    logger.info(`Applying hierarchical configuration for ontology: ${ontologyName}`);
    
    for (const structure of config.structures) {
      try {
        const hierarchicalRelationships = await this.advancedGraphService.buildHierarchicalStructure(
          structure.parentType,
          structure.childType,
          structure.relationshipType
        );
        
        // Update metadata with ontology information
        const updatedRelationships = hierarchicalRelationships.map(rel => ({
          ...rel,
          hierarchyType: structure.name,
          properties: {
            ...rel.properties,
            ...structure.properties
          },
          metadata: {
            ...rel.metadata,
            ontology: ontologyName,
            structureName: structure.name
          }
        }));
        
        if (updatedRelationships.length > 0) {
          await this.advancedGraphService.createHierarchicalRelationships(updatedRelationships);
        }
        
        logger.info(`Applied hierarchical structure: ${structure.name}`);
      } catch (error) {
        logger.error(`Failed to apply hierarchical structure ${structure.name}:`, error);
      }
    }
  }

  /**
   * Apply similarity relationship configuration
   */
  private async applySimilarityConfiguration(ontologyName: string, config: any): Promise<void> {
    logger.info(`Applying similarity configuration for ontology: ${ontologyName}`);
    
    for (const algorithm of config.algorithms) {
      try {
        const factors = algorithm.factors.map((f: any) => f.property);
        const similarities = await this.advancedGraphService.calculateEntitySimilarity(
          algorithm.entityType,
          factors
        );
        
        // Filter by threshold and update metadata
        const filteredSimilarities = similarities
          .filter(sim => sim.score >= algorithm.threshold)
          .map(sim => ({
            ...sim,
            similarityType: algorithm.name,
            metadata: {
              ...sim.metadata,
              ontology: ontologyName,
              algorithmName: algorithm.name,
              threshold: algorithm.threshold
            }
          }));
        
        if (filteredSimilarities.length > 0) {
          await this.advancedGraphService.createSimilarityRelationships(filteredSimilarities);
        }
        
        logger.info(`Applied similarity algorithm: ${algorithm.name} for ${similarities.length} entities`);
      } catch (error) {
        logger.error(`Failed to apply similarity algorithm ${algorithm.name}:`, error);
      }
    }
  }

  /**
   * Apply complex relationship configuration
   */
  private async applyComplexConfiguration(ontologyName: string, config: any): Promise<void> {
    logger.info(`Applying complex configuration for ontology: ${ontologyName}`);
    
    const enabledPatterns = config.patterns.filter((p: any) => p.enabled);
    
    const patternDefinitions = enabledPatterns.map((pattern: any) => ({
      name: pattern.name,
      description: pattern.description,
      cypherQuery: pattern.cypherQuery,
      parameters: pattern.parameters,
      resultMapping: pattern.resultMapping
    }));
    
    if (patternDefinitions.length > 0) {
      const complexRelationships = await this.advancedGraphService.createComplexPatterns(patternDefinitions);
      
      // Update metadata with ontology information
      const updatedRelationships = complexRelationships.map(rel => ({
        ...rel,
        metadata: {
          ...rel.metadata,
          ontology: ontologyName
        }
      }));
      
      if (updatedRelationships.length > 0) {
        await this.advancedGraphService.createComplexRelationships(updatedRelationships);
      }
      
      logger.info(`Applied complex patterns for ontology ${ontologyName} with ${updatedRelationships.length} relationships`);
    }
  }

  /**
   * Get entities by type from Neo4j
   */
  private async getEntitiesByType(entityType: string): Promise<Array<{ id: string; name: string }>> {
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const result = await this.session.run(
      `MATCH (e:${entityType}) RETURN e.id as id, e.name as name LIMIT 100`
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name')
    }));
  }

  /**
   * Query ontology patterns with custom parameters
   */
  async queryOntologyPatterns(ontologyName: string, patternType: string, parameters?: Record<string, any>): Promise<any[]> {
    const ontology = this.ontologies.get(ontologyName);
    if (!ontology) {
      throw new Error(`Ontology ${ontologyName} not found`);
    }
    
    const queries = ontology.advancedRelationships.queries;
    if (!queries) {
      throw new Error(`No queries configured for ontology ${ontologyName}`);
    }
    
    const queryConfig = queries[patternType as keyof typeof queries];
    if (!queryConfig?.enabled || !queryConfig.customQuery) {
      throw new Error(`Query type ${patternType} not enabled or configured for ontology ${ontologyName}`);
    }
    
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const result = await this.session.run(queryConfig.customQuery, parameters || {});
    return result.records.map(record => record.toObject());
  }

  /**
   * Get list of loaded ontologies
   */
  getLoadedOntologies(): string[] {
    return Array.from(this.ontologies.keys());
  }

  /**
   * Get ontology configuration
   */
  getOntologyConfig(ontologyName: string): OntologyAdvancedConfig | undefined {
    return this.ontologies.get(ontologyName);
  }

  /**
   * Get statistics for all loaded ontologies
   */
  async getOntologyStatistics(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [ontologyName, ontology] of this.ontologies) {
      const ontologyStats: any = {
        name: ontology.name,
        version: ontology.version,
        entities: Object.keys(ontology.entities).length,
        relationships: Object.keys(ontology.relationships).length,
        advancedRelationships: {
          temporal: ontology.advancedRelationships.temporal?.enabled || false,
          hierarchical: ontology.advancedRelationships.hierarchical?.enabled || false,
          similarity: ontology.advancedRelationships.similarity?.enabled || false,
          complex: ontology.advancedRelationships.complex?.enabled || false
        }
      };
      
      // Get relationship counts from Neo4j
      if (this.session) {
        try {
          const result = await this.session.run(
            `MATCH ()-[r]-() WHERE type(r) CONTAINS '${ontologyName.toUpperCase()}' RETURN count(r) as count`
          );
          ontologyStats['relationshipCount'] = result.records[0]?.get('count') || 0;
        } catch (error) {
          logger.warn(`Could not get relationship count for ontology ${ontologyName}:`, error);
          ontologyStats['relationshipCount'] = 0;
        }
      }
      
      stats[ontologyName] = ontologyStats;
    }
    
    return stats;
  }

  /**
   * Execute ontology-specific analysis
   */
  async executeOntologyAnalysis(ontologyName: string, analysisType: string, parameters?: Record<string, any>): Promise<any[]> {
    const ontology = this.ontologies.get(ontologyName);
    if (!ontology) {
      throw new Error(`Ontology ${ontologyName} not found`);
    }
    
    switch (analysisType) {
      case 'temporal':
        return this.executeTemporalAnalysis(ontology, parameters);
      case 'hierarchical':
        return this.executeHierarchicalAnalysis(ontology, parameters);
      case 'similarity':
        return this.executeSimilarityAnalysis(ontology, parameters);
      case 'complex':
        return this.executeComplexAnalysis(ontology, parameters);
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  /**
   * Execute temporal analysis for ontology
   */
  private async executeTemporalAnalysis(ontology: OntologyAdvancedConfig, parameters?: Record<string, any>): Promise<any[]> {
    if (!ontology.advancedRelationships.temporal?.enabled) {
      throw new Error('Temporal analysis not enabled for this ontology');
    }
    
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const query = `
      MATCH (e)-[r:TEMPORAL_RELATIONSHIP]->(related)
      WHERE r.ontology = $ontologyName
      RETURN e.name as entity, related.name as relatedEntity, r.timelineData as timeline
      ORDER BY r.createdAt DESC
      LIMIT $limit
    `;
    
    const result = await this.session.run(query, {
      ontologyName: ontology.name,
      limit: parameters?.limit || 50
    });
    
    return result.records.map(record => record.toObject());
  }

  /**
   * Execute hierarchical analysis for ontology
   */
  private async executeHierarchicalAnalysis(ontology: OntologyAdvancedConfig, parameters?: Record<string, any>): Promise<any[]> {
    if (!ontology.advancedRelationships.hierarchical?.enabled) {
      throw new Error('Hierarchical analysis not enabled for this ontology');
    }
    
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const query = `
      MATCH path = (parent)-[r:HIERARCHICAL_RELATIONSHIP*1..3]->(child)
      WHERE r.ontology = $ontologyName
      RETURN parent.name as parent, child.name as child, length(path) as level
      ORDER BY level
      LIMIT $limit
    `;
    
    const result = await this.session.run(query, {
      ontologyName: ontology.name,
      limit: parameters?.limit || 50
    });
    
    return result.records.map(record => record.toObject());
  }

  /**
   * Execute similarity analysis for ontology
   */
  private async executeSimilarityAnalysis(ontology: OntologyAdvancedConfig, parameters?: Record<string, any>): Promise<any[]> {
    if (!ontology.advancedRelationships.similarity?.enabled) {
      throw new Error('Similarity analysis not enabled for this ontology');
    }
    
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const query = `
      MATCH (e1)-[r:SIMILARITY_RELATIONSHIP]->(e2)
      WHERE r.ontology = $ontologyName AND r.score >= $threshold
      RETURN e1.name as entity1, e2.name as entity2, r.score as similarity
      ORDER BY r.score DESC
      LIMIT $limit
    `;
    
    const result = await this.session.run(query, {
      ontologyName: ontology.name,
      threshold: parameters?.threshold || 0.7,
      limit: parameters?.limit || 50
    });
    
    return result.records.map(record => record.toObject());
  }

  /**
   * Execute complex analysis for ontology
   */
  private async executeComplexAnalysis(ontology: OntologyAdvancedConfig, parameters?: Record<string, any>): Promise<any[]> {
    if (!ontology.advancedRelationships.complex?.enabled) {
      throw new Error('Complex analysis not enabled for this ontology');
    }
    
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }
    
    const query = `
      MATCH (source)-[r:COMPLEX_RELATIONSHIP]->(target)
      WHERE r.ontology = $ontologyName AND r.confidence >= $confidence
      RETURN source.name as source, target.name as target, r.type as type, r.confidence as confidence
      ORDER BY r.confidence DESC
      LIMIT $limit
    `;
    
    const result = await this.session.run(query, {
      ontologyName: ontology.name,
      confidence: parameters?.confidence || 0.8,
      limit: parameters?.limit || 50
    });
    
    return result.records.map(record => record.toObject());
  }

  /**
   * Close the service and clean up resources
   */
  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
    }
    await this.advancedGraphService.close();
    await this.neo4jConnection.close();
  }

  /**
   * Load ontology configuration from JSON file
   */
  private async loadOntologyConfig(ontologyName: string): Promise<AdvancedRelationshipsConfig | null> {
    try {
      // Try to load from the ontology's own JSON file first
      const ontologyPath = path.join(__dirname, '..', '..', 'ontologies', ontologyName, 'ontology.json');
      
      if (fs.existsSync(ontologyPath)) {
        const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
        
        if (ontologyData.advancedRelationships) {
          logger.info(`Loaded advanced relationships config from ${ontologyName} ontology`);
          return ontologyData.advancedRelationships;
        }
      }
      
      // Fallback to config directory
      const configPath = path.join(__dirname, '..', '..', '..', 'config', 'ontology', `${ontologyName}-advanced.ontology.json`);
      
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        logger.info(`Loaded advanced relationships config from config directory for ${ontologyName}`);
        return configData;
      }
      
      logger.warn(`No advanced relationships configuration found for ontology: ${ontologyName}`);
      return null;
    } catch (error) {
      logger.error(`Error loading advanced relationships config for ${ontologyName}:`, error);
      return null;
    }
  }
} 