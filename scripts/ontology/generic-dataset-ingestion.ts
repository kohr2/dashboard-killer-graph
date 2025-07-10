#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { GenericIngestionPipeline } from '../../src/ingestion/pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '../../src/platform/processing/content-processing.service';
import { Neo4jIngestionService } from '../../src/platform/processing/neo4j-ingestion.service';
import { registerAllOntologies } from '../../src/register-ontologies';
import { logger } from '../../src/common/utils/logger';

interface GenericDatasetIngestionOptions {
  ontologyName?: string;
  configPath?: string;
  datasetPath?: string;
  limit?: number;
  dryRun?: boolean;
  outputDir?: string;
}

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

interface OntologyConfig {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  priority: number;
  source: {
    url: string;
    type: string;
    version: string;
    description: string;
  };
  extraction: {
    entities: Record<string, any>;
    relationships: Record<string, any>;
  };
  datasets?: Record<string, any>;
  settings?: Record<string, any>;
  features?: Record<string, any>;
  overrides?: {
    entities: Record<string, any>;
    relationships: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Generic Dataset Ingestion Service
 * 
 * This service is completely ontology-agnostic and uses both config.json and ontology.json
 * to validate and ingest any dataset that matches the ontology schema.
 */
class GenericDatasetIngestionService {
  private ontologyDir: string;
  private config: OntologyConfig | null = null;
  private ontologySchema: any = null;

  constructor(private ontologyName: string) {
    this.ontologyDir = path.join(__dirname, `../../ontologies/${ontologyName}`);
  }

  /**
   * Load and validate configuration files
   */
  private loadConfiguration(): void {
    // Load config.json
    const configPath = path.join(this.ontologyDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    logger.info(`Loaded config for ontology: ${this.config?.name}`);

    // Load ontology.json
    const ontologyPath = path.join(this.ontologyDir, 'ontology.json');
    if (!fs.existsSync(ontologyPath)) {
      throw new Error(`Ontology file not found: ${ontologyPath}`);
    }

    this.ontologySchema = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'));
    const entityCount = Object.keys(this.ontologySchema.entities || {}).length;
    logger.info(`Loaded ontology schema with ${entityCount} entity types`);
  }

  /**
   * Validate dataset against ontology schema
   */
  private validateDataset(dataset: GenericDataset): void {
    logger.info('Validating dataset against ontology schema...');

    // Validate metadata
    if (dataset.metadata.ontology !== this.config?.name) {
      throw new Error(`Dataset ontology mismatch: expected ${this.config?.name}, got ${dataset.metadata.ontology}`);
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

    logger.info(`Dataset validation completed. Found ${dataset.records.length} records.`);
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
   * Ingest dataset using the generic pipeline
   */
  async ingestDataset(options: GenericDatasetIngestionOptions): Promise<void> {
    try {
      logger.info(`🚀 Starting generic dataset ingestion for ontology: ${this.ontologyName}`);

      // Load configuration
      this.loadConfiguration();

      // Determine dataset path
      let datasetPath: string;
      if (options.datasetPath) {
        datasetPath = options.datasetPath;
      } else {
        // Look for generic dataset in ontology data directory
        const dataDir = path.join(this.ontologyDir, 'data');
        datasetPath = path.join(dataDir, 'generic-dataset.json');
      }

      if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
      }

      // Load dataset
      const dataset: GenericDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
      logger.info(`Loaded dataset with ${dataset.records.length} records`);

      // Validate dataset against ontology schema
      this.validateDataset(dataset);

      // Apply limit if specified
      const recordsToProcess = options.limit ? dataset.records.slice(0, options.limit) : dataset.records;
      logger.info(`Processing ${recordsToProcess.length} records`);

      if (options.dryRun) {
        logger.info('🔍 DRY RUN - No actual ingestion will occur');
        logger.info('📋 Sample records:');
        recordsToProcess.slice(0, 3).forEach((record, index) => {
          logger.info(`  ${index + 1}. ${record.id}: ${record.content.substring(0, 100)}...`);
        });
        return;
      }

      // Register ontologies
      logger.info('🔄 Registering ontologies...');
      registerAllOntologies();

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
        this.config?.name
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
        logger.info('✅ Generic dataset ingestion completed successfully!');
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
      logger.error('❌ Generic dataset ingestion failed:', error);
      throw error;
    }
  }

  /**
   * List available datasets for an ontology
   */
  static listAvailableDatasets(ontologyName: string): void {
    const ontologyDir = path.join(__dirname, `../../ontologies/${ontologyName}`);
    const configPath = path.join(ontologyDir, 'config.json');
    const dataDir = path.join(ontologyDir, 'data');

    if (!fs.existsSync(configPath)) {
      logger.error(`Config file not found for ontology: ${ontologyName}`);
      return;
    }

    const config: OntologyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    logger.info(`📊 Available datasets for ontology: ${config.name}`);
    logger.info(`📋 Description: ${config.description}`);
    
    if (config.datasets) {
      Object.entries(config.datasets).forEach(([key, dataset]) => {
        logger.info(`  • ${key}: ${dataset.name}`);
        logger.info(`    Description: ${dataset.description}`);
        logger.info(`    Source: ${dataset.source}`);
        logger.info(`    URL: ${dataset.url}`);
        logger.info(`    Format: ${dataset.format}`);
        logger.info(`    Records: ${dataset.records}`);
        logger.info('');
      });
    } else {
      logger.info('  No datasets configured in config.json');
    }

    // Check for existing generic datasets
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      const genericDatasets = files.filter(file => file.includes('generic-dataset'));
      
      if (genericDatasets.length > 0) {
        logger.info('📁 Existing generic datasets:');
        genericDatasets.forEach(file => {
          const filePath = path.join(dataDir, file);
          const stats = fs.statSync(filePath);
          logger.info(`  • ${file} (${stats.size} bytes, ${new Date(stats.mtime).toLocaleDateString()})`);
        });
      }
    }
  }
}

/**
 * Main ingestion function
 */
async function ingestGenericDataset(options: GenericDatasetIngestionOptions): Promise<void> {
  try {
    // Determine ontology name
    let ontologyName: string;
    if (options.ontologyName) {
      ontologyName = options.ontologyName;
    } else if (options.configPath) {
      // Extract ontology name from config path
      const configDir = path.dirname(options.configPath);
      ontologyName = path.basename(configDir);
    } else {
      throw new Error('Please specify either --ontology-name or --config-path');
    }

    const service = new GenericDatasetIngestionService(ontologyName);
    await service.ingestDataset(options);

  } catch (error) {
    logger.error('❌ Generic dataset ingestion failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): GenericDatasetIngestionOptions {
  const args = process.argv.slice(2);
  const options: GenericDatasetIngestionOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--ontology-name':
        options.ontologyName = args[++i];
        break;
      case '--config-path':
        options.configPath = args[++i];
        break;
      case '--dataset-path':
        options.datasetPath = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--list-datasets':
        if (args[i + 1]) {
          GenericDatasetIngestionService.listAvailableDatasets(args[i + 1]);
          process.exit(0);
        } else {
          logger.error('Please specify ontology name with --list-datasets');
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
📊 Generic Dataset Ingestion CLI

This tool ingests datasets that have been converted to the generic format.
It uses both config.json and ontology.json to validate and process the data.

Usage: npx ts-node scripts/ontology/generic-dataset-ingestion.ts [options]

Options:
  --ontology-name <name>   Name of ontology (uses ontologies/<name>/)
  --config-path <path>     Path to ontology config file
  --dataset-path <path>    Path to generic dataset file (default: ontologies/<name>/data/generic-dataset.json)
  --limit <number>         Limit number of records to process
  --dry-run               Show what would be processed without ingesting
  --output-dir <path>     Custom output directory
  --list-datasets <name>  List available datasets for an ontology
  --help, -h              Show this help message

Examples:
  # Ingest ISCO dataset
  npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco

  # Ingest with custom dataset path
  npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco --dataset-path ./custom-dataset.json

  # Dry run with limit
  npx ts-node scripts/ontology/generic-dataset-ingestion.ts --ontology-name isco --limit 100 --dry-run

  # List available datasets
  npx ts-node scripts/ontology/generic-dataset-ingestion.ts --list-datasets isco

Workflow:
  1. Transform raw data to generic format (see transformation scripts)
  2. Use this tool to ingest the generic dataset
  3. Data is validated against ontology.json schema
  4. Data is inserted into Neo4j using ontology-defined types
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  ingestGenericDataset(options).catch(error => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { GenericDatasetIngestionService, ingestGenericDataset }; 