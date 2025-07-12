#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { GenericIngestionPipeline } from '../../ingestion/pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from './content-processing.service';
import { Neo4jIngestionService } from './neo4j-ingestion.service';
import { logger } from '../../common/utils/logger';
import { container } from 'tsyringe';
import { OntologyService } from '../ontology/ontology.service';

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
  private convertDatasetToEntitiesAndRelationships(dataset: OntologyDataset): {
    entities: Array<{
      id: string;
      name: string;
      type: string;
      label: string;
      properties: Record<string, any>;
      embedding?: number[];
    }>;
    relationships: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  } {
    const entities: Array<{
      id: string;
      name: string;
      type: string;
      label: string;
      properties: Record<string, any>;
      embedding?: number[];
    }> = [];
    
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
    }> = [];

    // Create entity map for relationship resolution
    const entityMap = new Map<string, string>();

    // Process entities
    for (const record of dataset.records) {
      const entity = {
        id: record.id,
        name: record.properties.name || record.properties.code || record.id,
        type: record.type,
        label: record.type,
        properties: {
          ...record.properties,
          ontology: dataset.metadata.ontology,
          source: dataset.metadata.source
        }
      };
      
      entities.push(entity);
      entityMap.set(record.id, entity.id);

      // Process relationships for this entity
      if (record.relationships) {
        for (const rel of record.relationships) {
          // Find target entity in the dataset
          const targetRecord = dataset.records.find(r => r.id === rel.target);
          if (targetRecord) {
            relationships.push({
              source: entity.id,
              target: rel.target,
              type: rel.type
            });
          } else {
            logger.warn(`Relationship target not found: ${rel.target} for entity ${record.id}`);
          }
        }
      }
    }

    logger.info(`Converted ${entities.length} entities and ${relationships.length} relationships from dataset`);
    return { entities, relationships };
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
      logger.warn('⚠️ Failed to generate embeddings, continuing without them:', error);
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
      });

      // Generate embeddings for entities
      await this.generateEmbeddings(entities);

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