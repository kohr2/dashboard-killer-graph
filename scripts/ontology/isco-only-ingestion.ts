#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { GenericIngestionPipeline } from '../../src/ingestion/pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '../../src/platform/processing/content-processing.service';
import { Neo4jIngestionService } from '../../src/platform/processing/neo4j-ingestion.service';
import { logger } from '../../src/common/utils/logger';
import { container } from 'tsyringe';
import { OntologyService } from '../../src/platform/ontology/ontology.service';
import { iscoPlugin } from '../../ontologies/isco/isco.plugin';

interface GenericDataset {
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
 * ISCO-only Dataset Ingestion Service
 * 
 * This service only loads the ISCO ontology to speed up ingestion.
 */
class ISCOOnlyIngestionService {
  private ontologyDir: string;
  private ontologySchema: any = null;

  constructor() {
    this.ontologyDir = path.join(__dirname, '../../ontologies/isco');
  }

  /**
   * Load ontology schema
   */
  private loadOntologySchema(): void {
    const ontologyPath = path.join(this.ontologyDir, 'ontology.json');
    if (!fs.existsSync(ontologyPath)) {
      throw new Error(`Ontology file not found: ${ontologyPath}`);
    }

    this.ontologySchema = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'));
    const entityCount = Object.keys(this.ontologySchema.entities || {}).length;
    logger.info(`Loaded ISCO ontology schema with ${entityCount} entity types`);
  }

  /**
   * Register only ISCO ontology
   */
  private registerISCOOnly(): void {
    logger.info('🔄 Registering ISCO ontology only...');
    
    // Register the ontology service
    container.registerSingleton(OntologyService);
    
    // Get the ontology service and load only ISCO
    const ontologyService = container.resolve(OntologyService);
    ontologyService.loadFromPlugins([iscoPlugin]);
    
    logger.info('✅ ISCO ontology loaded and registered');
  }

  /**
   * Validate dataset against ontology schema
   */
  private validateDataset(dataset: GenericDataset): void {
    logger.info('Validating dataset against ISCO ontology schema...');

    // Validate metadata
    if (dataset.metadata.ontology !== 'isco') {
      throw new Error(`Dataset ontology mismatch: expected isco, got ${dataset.metadata.ontology}`);
    }

    // Validate records
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

    logger.info(`Dataset validation completed. Found ${dataset.records.length} records`);
  }

  /**
   * Convert dataset to ingestion inputs
   */
  private convertToIngestionInputs(dataset: GenericDataset): any[] {
    return dataset.records.map(record => ({
      id: record.id,
      content: record.content,
      meta: {
        source: dataset.metadata.source,
        ontology: dataset.metadata.ontology,
        type: record.type,
        ...record.properties
      }
    }));
  }

  /**
   * Ingest ISCO dataset
   */
  async ingestISCODataset(limit?: number): Promise<void> {
    try {
      logger.info('🚀 Starting ISCO-only dataset ingestion');

      // Load ontology schema
      this.loadOntologySchema();

      // Load dataset
      const datasetPath = path.join(this.ontologyDir, 'data', 'generic-dataset.json');
      if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
      }

      const dataset: GenericDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
      logger.info(`Loaded dataset with ${dataset.records.length} records`);

      // Validate dataset
      this.validateDataset(dataset);

      // Apply limit if specified
      const recordsToProcess = limit ? dataset.records.slice(0, limit) : dataset.records;
      logger.info(`Processing ${recordsToProcess.length} records`);

      // Register only ISCO ontology
      this.registerISCOOnly();

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
        'isco'
      );

      // Convert to ingestion inputs
      const ingestionInputs = this.convertToIngestionInputs({
        ...dataset,
        records: recordsToProcess
      });

      // Run ingestion
      logger.info('🚀 Starting dataset ingestion...');
      try {
        await pipeline.run(ingestionInputs);
        logger.info('✅ ISCO dataset ingestion completed successfully!');
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
      logger.error('❌ ISCO dataset ingestion failed:', error);
      throw error;
    }
  }
}

/**
 * Main function
 */
async function main() {
  const limit = process.argv.includes('--limit') ? 
    parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : 
    undefined;

  const service = new ISCOOnlyIngestionService();
  await service.ingestISCODataset(limit);
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('❌ ISCO ingestion failed:', error);
    process.exit(1);
  });
} 