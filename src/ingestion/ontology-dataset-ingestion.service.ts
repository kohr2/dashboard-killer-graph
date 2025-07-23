#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { GenericIngestionPipeline } from './pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '../platform/processing/content-processing.service';
import { Neo4jIngestionService } from '../platform/processing/neo4j-ingestion.service';
import { logger } from '@shared/utils/logger';
import { container } from 'tsyringe';
import { OntologyService } from '../platform/ontology/ontology.service';

interface OntologyDataset {
  metadata: {
    source: string;
    ontology: string;
    version: string;
    createdAt: string;
    recordCount: number;
  };
  records: Array<{
    id: string;
    type: string;
    content: string;
    properties: Record<string, any>;
    relationships?: Array<{
      type: string;
      target: string;
    }>;
  }>;
}

/**
 * Generic Ontology Dataset Ingestion Service
 * 
 * This service ingests ontology datasets into the knowledge graph.
 * It's ontology-agnostic and can work with any ontology dataset format.
 * 
 * For pre-structured datasets, it bypasses LLM processing since entities
 * and relationships are already defined in the dataset.
 */
export class OntologyDatasetIngestionService {
  private ontologySchema: any = null;

  /**
   * Load ontology schema from a plugin
   */
  private loadOntologySchema(ontologyPlugin: any): void {
    if (ontologyPlugin.ontology) {
      this.ontologySchema = ontologyPlugin.ontology;
      logger.info(`Loaded ontology schema with ${Object.keys(this.ontologySchema?.entities || {}).length} entity types`);
    } else {
      logger.warn('No ontology schema found in plugin');
    }
  }

  /**
   * Register ontology plugin
   */
  private registerOntology(ontologyPlugin: any): void {
    logger.info(`🔄 Registering ${ontologyPlugin.name || 'ontology'} plugin...`);
    
    // Register the ontology service
    container.registerSingleton(OntologyService);
    
    // Get the ontology service and load the plugin
    const ontologyService = container.resolve(OntologyService);
    ontologyService.loadFromPlugins([ontologyPlugin]);
    
    logger.info(`✅ ${ontologyPlugin.name || 'Ontology'} loaded and registered`);
  }

  /**
   * Validate dataset against ontology schema
   */
  private validateDataset(dataset: OntologyDataset, ontologyName: string): void {
    logger.info(`Validating ${ontologyName} dataset against ontology schema...`);

    // Validate metadata
    if (dataset.metadata.ontology !== ontologyName) {
      throw new Error(`Dataset ontology mismatch: expected ${ontologyName}, got ${dataset.metadata.ontology}`);
    }

    // Validate records if schema is available
    if (this.ontologySchema) {
      const validEntityTypes = Object.keys(this.ontologySchema?.entities || {});
      const validRelationshipTypes = Object.keys(this.ontologySchema?.relationships || {});

      logger.info(`Valid entity types: ${validEntityTypes.join(', ')}`);
      logger.info(`Valid relationship types: ${validRelationshipTypes.join(', ')}`);

      let invalidEntityTypes = 0;
      let invalidRelationshipTypes = 0;

      for (const record of dataset.records) {
        // Validate entity type
        if (!validEntityTypes.includes(record.type)) {
          logger.warn(`Invalid entity type in record ${record.id}: ${record.type}`);
          invalidEntityTypes++;
        }

        // Validate relationships
        if (record.relationships) {
          for (const rel of record.relationships) {
            if (!validRelationshipTypes.includes(rel.type)) {
              logger.warn(`Invalid relationship type in record ${record.id}: ${rel.type}`);
              invalidRelationshipTypes++;
            }
          }
        }
      }

      if (invalidEntityTypes > 0 || invalidRelationshipTypes > 0) {
        logger.warn(`Validation summary: ${invalidEntityTypes} invalid entity types, ${invalidRelationshipTypes} invalid relationship types`);
      }
    }

    logger.info(`Dataset validation completed. Found ${dataset.records.length} records`);
  }

  /**
   * Convert dataset records directly to entities and relationships
   * This bypasses LLM processing since the data is already structured
   */
  private convertDatasetToEntitiesAndRelationships(dataset: OntologyDataset, ontologyName: string): {
    entities: Array<{
      id: string;
      name: string;
      type: string;
      label: string;
      properties: Record<string, any>;
      embedding?: number[];
      uuid?: string; // Add uuid at top level for Neo4jIngestionService
    }>;
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      properties?: Record<string, any>;
    }>;
  } {
    const entities: Array<{
      id: string;
      name: string;
      type: string;
      label: string;
      properties: Record<string, any>;
      embedding?: number[];
      uuid?: string;
    }> = [];
    
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      properties?: Record<string, any>;
    }> = [];

    // Create entity map for relationship resolution
    const entityMap = new Map<string, any>();

    // First, create all entities with their unique dataset IDs
    for (const record of dataset.records) {
      const entity = {
        id: record.id, // Use the exact ID from dataset (e.g., JobTitle_10)
        name: record.properties.name || record.properties.code || record.id,
        type: record.type,
        label: record.type,
        uuid: record.id, // Set uuid at top level for Neo4jIngestionService
        properties: {
          ...record.properties,
          ontology: ontologyName
        }
      };
      
      entities.push(entity);
      entityMap.set(record.id, entity);
    }

    // Create Ontology node
    const ontologyEntity = {
      id: `Ontology_${ontologyName}`,
      name: ontologyName,
      type: 'Ontology',
      label: 'Ontology',
      uuid: `Ontology_${ontologyName}`, // Set uuid at top level
      properties: {
        name: ontologyName,
        ontology: ontologyName
      }
    };
    entities.push(ontologyEntity);
    logger.info(`Ontology node entity added: ${JSON.stringify(ontologyEntity)}`);

    // Create REFERENCES relationships from Ontology to all entities with uuid property
    for (const record of dataset.records) {
      relationships.push({
        source: `Ontology_${ontologyName}`,
        target: record.id,
        type: 'REFERENCES',
        properties: {
          uuid: record.id
        }
      });
    }

    // Process relationships between entities (excluding Ontology relationships)
    for (const record of dataset.records) {
      if (record.relationships) {
        for (const rel of record.relationships) {
          // Find target entity in the dataset
          const targetRecord = dataset.records.find(r => r.id === rel.target);
          
          // Check if this is an ignorable pattern based on ontology config
          const shouldIgnore = this.shouldIgnoreMissingTarget(rel.target, ontologyName);
          
          if (targetRecord) {
            relationships.push({
              source: record.id,
              target: rel.target,
              type: rel.type
            });
          } else if (!shouldIgnore) {
            logger.warn(`Relationship target not found: ${rel.target} for entity ${record.id}`);
          }
        }
      }
    }

    return { entities, relationships };
  }

  /**
   * Check if a missing target should be ignored based on ontology configuration
   */
  private shouldIgnoreMissingTarget(targetId: string, ontologyName: string): boolean {
    // Load ontology config to check for ignore patterns
    try {
      const configPath = path.join(process.cwd(), 'ontologies', ontologyName, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.ignoreMissingTargetPatterns) {
          return config.ignoreMissingTargetPatterns.some((pattern: string) => {
            const regex = new RegExp(pattern);
            return regex.test(targetId);
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to load ignore patterns for ontology ${ontologyName}:`, error);
    }
    
    return false;
  }

  /**
   * Generate embeddings for entities using NLP service
   */
  private async generateEmbeddings(entities: Array<{ name: string; embedding?: number[] }>): Promise<void> {
    const entityNames = entities.map(e => e.name);
    logger.info(`Generating embeddings for ${entityNames.length} entities...`);
    
    try {
      const axios = require('axios');
      const response = await axios.post(
        'http://127.0.0.1:8000/embed',
        { texts: entityNames },
        { timeout: 120000 }
      );
      
      const { embeddings } = response.data;
      if (embeddings && embeddings.length === entities.length) {
        entities.forEach((entity, index) => {
          entity.embedding = embeddings[index];
        });
        logger.info(`✅ Generated embeddings for ${entities.length} entities`);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to generate embeddings from NLP service, creating dummy embeddings:', error);
      
      // Create dummy embeddings to ensure entities are not skipped
      // This is a fallback when the NLP service is unavailable
      entities.forEach((entity, index) => {
        // Create a simple hash-based embedding (not for similarity search, just to satisfy the requirement)
        const hash = entity.name.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        // Create a 384-dimensional vector (standard embedding size) with hash-based values
        const dummyEmbedding = new Array(384).fill(0).map((_, i) => {
          return Math.sin(hash + i) * 0.1; // Small values to avoid overwhelming the vector space
        });
        
        entity.embedding = dummyEmbedding;
      });
      
      logger.info(`✅ Created dummy embeddings for ${entities.length} entities (NLP service unavailable)`);
    }
  }

  /**
   * Ingest ontology dataset directly without LLM processing
   */
  async ingestOntologyDataset(
    datasetPath: string,
    ontologyPlugin: any,
    limit?: number
  ): Promise<void> {
    logger.info('🔍 [AUDIT] ingestOntologyDataset called - DIRECT INGESTION MODE (NO LLM)');
    logger.info('🔍 [AUDIT] This method should NOT use any LLM processing');
    try {
      const ontologyName = ontologyPlugin.name || 'ontology';
      logger.info(`🚀 Starting ${ontologyName} dataset ingestion (direct mode - no LLM processing)`);

      // Load ontology schema
      this.loadOntologySchema(ontologyPlugin);

      // Load dataset
      if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
      }

      const dataset: OntologyDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
      logger.info(`Loaded dataset with ${dataset.records.length} records`);

      // Validate dataset
      this.validateDataset(dataset, ontologyName);

      // Apply limit if specified
      const recordsToProcess = limit ? dataset.records.slice(0, limit) : dataset.records;
      logger.info(`Processing ${recordsToProcess.length} records`);

      // Register ontology
      this.registerOntology(ontologyPlugin);

      // Convert dataset directly to entities and relationships
      const { entities, relationships } = this.convertDatasetToEntitiesAndRelationships({
        ...dataset,
        records: recordsToProcess
      }, ontologyName);

      // Skip embedding generation in direct mode to avoid NLP service calls
      logger.info('🔄 Direct ingestion mode: skipping embedding generation to avoid LLM processing');
      // Create dummy embeddings to ensure entities are not skipped
      entities.forEach((entity, index) => {
        const hash = entity.name.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        const dummyEmbedding = new Array(384).fill(0).map((_, i) => {
          return Math.sin(hash + i) * 0.1;
        });
        
        entity.embedding = dummyEmbedding;
      });
      logger.info(`✅ Created dummy embeddings for ${entities.length} entities (direct mode)`);

      // Initialize Neo4j service and ingest directly
      logger.info('🔄 Initializing Neo4j service...');
      const neo4jIngestionService = new Neo4jIngestionService();
      await neo4jIngestionService.initialize();

      try {
        // Ingest entities and relationships directly
        logger.info(`🚀 Ingesting ${entities.length} entities and ${relationships.length} relationships...`);
        await neo4jIngestionService.ingestEntitiesAndRelationships({
          entities,
          relationships
        });
        
        logger.info(`✅ ${ontologyName} dataset ingestion completed successfully!`);
        logger.info(`📊 Processed ${entities.length} entities and ${relationships.length} relationships`);
        logger.info('🔍 Data is now available in the knowledge graph');
        
      } finally {
        // Close Neo4j service
        await neo4jIngestionService.close();
      }

    } catch (error) {
      logger.error('❌ Ontology dataset ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method that uses LLM processing (for backward compatibility)
   * Use ingestOntologyDataset for better performance with pre-structured data
   */
  async ingestOntologyDatasetWithLLM(
    datasetPath: string,
    ontologyPlugin: any,
    limit?: number
  ): Promise<void> {
    logger.info('🔍 [AUDIT] ingestOntologyDatasetWithLLM called - LLM PROCESSING MODE');
    logger.info('🔍 [AUDIT] This method WILL use LLM processing');
    try {
      const ontologyName = ontologyPlugin.name || 'ontology';
      logger.info(`🚀 Starting ${ontologyName} dataset ingestion (LLM mode)`);

      // Load ontology schema
      this.loadOntologySchema(ontologyPlugin);

      // Load dataset
      if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
      }

      const dataset: OntologyDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
      logger.info(`Loaded dataset with ${dataset.records.length} records`);

      // Validate dataset
      this.validateDataset(dataset, ontologyName);

      // Apply limit if specified
      const recordsToProcess = limit ? dataset.records.slice(0, limit) : dataset.records;
      logger.info(`Processing ${recordsToProcess.length} records`);

      // Register ontology
      this.registerOntology(ontologyPlugin);

      // Initialize services
      logger.info('🔄 Initializing ingestion services...');
      const contentProcessingService = new ContentProcessingService();
      const neo4jIngestionService = new Neo4jIngestionService();

      // Initialize Neo4j service
      await neo4jIngestionService.initialize();

      // Create ingestion pipeline
      const pipeline = new GenericIngestionPipeline(
        contentProcessingService,
        neo4jIngestionService,
        undefined,
        (input: any) => input.content,
        ontologyName
      );

      // Convert to ingestion inputs
      const ingestionInputs = recordsToProcess.map(record => ({
        id: record.id,
        content: record.content,
        meta: {
          source: dataset.metadata.source,
          ontology: dataset.metadata.ontology,
          type: record.type,
          ...record.properties
        }
      }));

      // Run ingestion
      logger.info(`🚀 Starting ${ontologyName} dataset ingestion with LLM processing...`);
      try {
        await pipeline.run(ingestionInputs);
        logger.info(`✅ ${ontologyName} dataset ingestion completed successfully!`);
        logger.info(`📊 Processed ${recordsToProcess.length} records`);
        logger.info('🔍 Data is now available in the knowledge graph');
      } catch (error) {
        logger.error('❌ Pipeline execution failed:', error);
        throw error;
      } finally {
        // Close Neo4j service
        await neo4jIngestionService.close();
      }

    } catch (error) {
      logger.error('❌ Ontology dataset ingestion failed:', error);
      throw error;
    }
  }
} 