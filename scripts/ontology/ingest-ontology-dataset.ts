#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';
import { OntologyDatasetIngestionService } from '../../src/platform/processing/ontology-dataset-ingestion.service';

/**
 * Generic Ontology Dataset Ingestion CLI
 * 
 * Usage:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/ingest-ontology-dataset.ts \
 *   --ontology-name isco \
 *   --dataset-path ontologies/isco/data/comprehensive-isco-dataset-english.json \
 *   --plugin-path ontologies/isco/isco.plugin.ts \
 *   --limit 100
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const ontologyName = getArgValue(args, '--ontology-name');
  const datasetPath = getArgValue(args, '--dataset-path');
  const pluginPath = getArgValue(args, '--plugin-path');
  const limitStr = getArgValue(args, '--limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const useLLM = args.includes('--use-llm');

  // Validate required arguments
  if (!ontologyName) {
    console.error('❌ --ontology-name is required');
    process.exit(1);
  }

  if (!datasetPath) {
    console.error('❌ --dataset-path is required');
    process.exit(1);
  }

  if (!pluginPath) {
    console.error('❌ --plugin-path is required');
    process.exit(1);
  }

  // Validate file paths
  if (!fs.existsSync(datasetPath!)) {
    console.error(`❌ Dataset file not found: ${datasetPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(pluginPath!)) {
    console.error(`❌ Plugin file not found: ${pluginPath}`);
    process.exit(1);
  }

  try {
    // Load the ontology plugin
    const pluginModule = require(path.resolve(pluginPath!));
    const ontologyPlugin = pluginModule.default || pluginModule[`${ontologyName}Plugin`] || pluginModule;

    if (!ontologyPlugin) {
      console.error(`❌ Could not find ontology plugin in: ${pluginPath}`);
      process.exit(1);
    }

    // Create ingestion service
    const ingestionService = new OntologyDatasetIngestionService();

    // Ingest the dataset
    if (useLLM) {
      console.log('🔄 Using LLM processing mode...');
      await ingestionService.ingestOntologyDatasetWithLLM(
        path.resolve(datasetPath),
        ontologyPlugin,
        limit
      );
    } else {
      console.log('🔄 Using direct ingestion mode (no LLM processing)...');
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