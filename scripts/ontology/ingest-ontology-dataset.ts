#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { OntologyDatasetIngestionService } from '../../src/ingestion/ontology-dataset-ingestion.service';

/**
 * Generic Ontology Dataset Ingestion CLI
 * 
 * Simplified usage with automatic path construction:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/ingest-ontology-dataset.ts \
 *   --ontology isco \
 *   --database jobboardkiller \
 *   --limit 100
 * 
 * The script automatically constructs paths:
 * - Dataset: ontologies/{ontology}/data/comprehensive-{ontology}-dataset-english.json
 * - Plugin: ontologies/{ontology}/{ontology}.plugin.ts
 * - Config: ontologies/{ontology}/config.json
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const ontologyName = getArgValue(args, '--ontology');
  const databaseName = getArgValue(args, '--database');
  const limitStr = getArgValue(args, '--limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const useLLM = args.includes('--use-llm');

  // Debug log for argument parsing
  console.log('--- Ontology Ingestion CLI Debug ---');
  console.log('Command line:', process.argv.join(' '));
  console.log('Parsed args:', args);
  console.log('Ontology:', ontologyName);
  console.log('Database:', databaseName);
  console.log('Limit:', limit);
  console.log('LLM mode:', useLLM ? 'ENABLED' : 'DISABLED (direct ingestion)');
  console.log('------------------------------------');

  // Validate required arguments
  if (!ontologyName) {
    console.error('❌ --ontology is required');
    console.error('Usage: --ontology <name> --database <name> [--limit <number>] [--use-llm]');
    process.exit(1);
  }

  if (!databaseName) {
    console.error('❌ --database is required');
    console.error('Usage: --ontology <name> --database <name> [--limit <number>] [--use-llm]');
    process.exit(1);
  }

  // Construct paths using standard naming conventions
  const datasetPath = `ontologies/${ontologyName}/data/comprehensive-${ontologyName}-dataset-english.json`;
  const pluginPath = `ontologies/${ontologyName}/${ontologyName}.plugin.ts`;
  const configPath = `ontologies/${ontologyName}/config.json`;

  console.log(`🔍 Looking for files:`);
  console.log(`   Dataset: ${datasetPath}`);
  console.log(`   Plugin: ${pluginPath}`);
  console.log(`   Config: ${configPath}`);

  // Validate file paths
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Dataset file not found: ${datasetPath}`);
    console.error(`   Expected: ontologies/${ontologyName}/data/comprehensive-${ontologyName}-dataset-english.json`);
    process.exit(1);
  }

  if (!fs.existsSync(pluginPath)) {
    console.error(`❌ Plugin file not found: ${pluginPath}`);
    console.error(`   Expected: ontologies/${ontologyName}/${ontologyName}.plugin.ts`);
    process.exit(1);
  }

  if (!fs.existsSync(configPath)) {
    console.warn(`⚠️ Config file not found: ${configPath}`);
    console.warn(`   Expected: ontologies/${ontologyName}/config.json`);
    console.warn(`   Continuing without config...`);
  }

  try {
    // Load the ontology plugin
    const pluginModule = require(path.resolve(pluginPath));
    const ontologyPlugin = pluginModule.default || pluginModule[`${ontologyName}Plugin`] || pluginModule;

    if (!ontologyPlugin) {
      console.error(`❌ Could not find ontology plugin in: ${pluginPath}`);
      process.exit(1);
    }

    // Set database name in environment for Neo4j connection
    process.env.NEO4J_DATABASE = databaseName;

    // Create ingestion service
    const ingestionService = new OntologyDatasetIngestionService();

    // Ingest the dataset
    if (useLLM) {
      console.log('🔄 Using LLM processing mode...');
      console.log('🔍 [AUDIT] Calling ingestOntologyDatasetWithLLM');
      await ingestionService.ingestOntologyDatasetWithLLM(
        path.resolve(datasetPath),
        ontologyPlugin,
        limit
      );
    } else {
      console.log('🔄 Using direct ingestion mode (no LLM processing)...');
      console.log('🔍 [AUDIT] Calling ingestOntologyDataset');
      await ingestionService.ingestOntologyDataset(
        path.resolve(datasetPath),
        ontologyPlugin,
        limit
      );
    }

    console.log('✅ Ontology dataset ingestion completed successfully!');

  } catch (error) {
    console.error('❌ Ontology dataset ingestion failed:', error);
    process.exit(1);
  }
}

/**
 * Get argument value from command line arguments
 */
function getArgValue(args: string[], argName: string): string | undefined {
  const index = args.indexOf(argName);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

if (require.main === module) {
  main().catch(console.error);
} 