#!/usr/bin/env ts-node

import { OntologyProcessor } from './cli';
import { OwlSource } from './sources/owl-source';
import { JsonSource } from './sources/json-source';
import { Config } from './config';
import * as fs from 'fs';
import * as path from 'path';

interface TestOptions {
  ontologyName?: string;
  configPath?: string;
  limit?: number;
}

async function testDatasetDownload(options: TestOptions = {}) {
  try {
    // Determine config path
    let configPath: string;
    if (options.configPath) {
      configPath = options.configPath;
    } else if (options.ontologyName) {
      configPath = path.join(__dirname, `../../ontologies/${options.ontologyName}/config.json`);
    } else {
      console.error('❌ Please specify either --config-path or --ontology-name');
      process.exit(1);
    }

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Config file not found: ${configPath}`);
      process.exit(1);
    }

    // Load config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);
    
    console.log(`📊 Testing Dataset Download for: ${config.name}`);
    console.log(`📋 Config loaded from: ${configPath}`);
    console.log(`🔗 Source: ${config.source.url}`);
    console.log(`📝 Description: ${config.source.description}`);
    
    // Initialize processor with available sources
    const ontologyKey = options.ontologyName?.toLowerCase();
    const owlSource = new OwlSource({ ontologyKey });
    const jsonSource = new JsonSource();
    const processor = new OntologyProcessor([owlSource, jsonSource]);
    
    // Process ontology to get entity/relationship schemas
    console.log('🔄 Processing ontology schema...');
    const result = await processor.processOntology(config);
    
    if (!result.success) {
      console.error('❌ Failed to process ontology:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Ontology schema processed successfully!');
    console.log(`📊 Entities: ${result.sourceOntology?.entities.length || 0}`);
    console.log(`🔗 Relationships: ${result.sourceOntology?.relationships.length || 0}`);
    
    // Test dataset download
    console.log('🔄 Testing dataset download...');
    const datasetItems = await testDatasetDownloadAndProcessing(config, options);
    
    if (datasetItems.length === 0) {
      console.error('❌ No dataset items found');
      process.exit(1);
    }
    
    console.log(`✅ Downloaded ${datasetItems.length} dataset items`);
    
    // Apply limit if specified
    const itemsToShow = options.limit ? datasetItems.slice(0, options.limit) : datasetItems.slice(0, 5);
    console.log(`📋 Sample items (showing ${itemsToShow.length}):`);
    itemsToShow.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.id}: ${item.content.substring(0, 100)}...`);
    });
    
    console.log('✅ Dataset download test completed successfully!');
    
  } catch (error) {
    console.error('❌ Dataset download test failed:', error);
    process.exit(1);
  }
}

async function testDatasetDownloadAndProcessing(config: Config, options: TestOptions): Promise<any[]> {
  const items: any[] = [];
  
  try {
    // Determine the source handler based on config type
    let source;
    if (config.source.type === 'json') {
      source = new JsonSource();
    } else if (config.source.type === 'owl' || config.source.type === 'rdf') {
      source = new OwlSource();
    } else {
      throw new Error(`Unsupported source type: ${config.source.type}`);
    }
    
    // Fetch and parse the dataset
    const content = await source.fetch(config.source.url);
    const parsed = await source.parse(content);
    
    // Extract entities and relationships to understand the data structure
    const entities = await source.extractEntities(config.extraction.entities, parsed);
    const relationships = await source.extractRelationships(config.extraction.relationships, parsed);
    
    console.log(`🔍 Found ${entities.length} entities and ${relationships.length} relationships in dataset`);
    
    // Convert raw data to ingestion items
    if (parsed.rawData) {
      const rawData = parsed.rawData;
      
      // Handle different data structures
      if (Array.isArray(rawData)) {
        // Array of items
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const item = rawData[i];
          const content = JSON.stringify(item, null, 2);
          items.push({
            id: `dataset-item-${i}`,
            content,
            metadata: {
              index: i,
              source: config.source.url,
              ontology: config.name
            }
          });
        }
      } else if (typeof rawData === 'object' && rawData !== null) {
        // Single object or object with items
        if (rawData.items && Array.isArray(rawData.items)) {
          // Object with items array
          for (let i = 0; i < Math.min(rawData.items.length, 10); i++) {
            const item = rawData.items[i];
            const content = JSON.stringify(item, null, 2);
            items.push({
              id: `dataset-item-${i}`,
              content,
              metadata: {
                index: i,
                source: config.source.url,
                ontology: config.name
              }
            });
          }
        } else if (rawData.data && Array.isArray(rawData.data)) {
          // Object with data array
          for (let i = 0; i < Math.min(rawData.data.length, 10); i++) {
            const item = rawData.data[i];
            const content = JSON.stringify(item, null, 2);
            items.push({
              id: `dataset-item-${i}`,
              content,
              metadata: {
                index: i,
                source: config.source.url,
                ontology: config.name
              }
            });
          }
        } else {
          // Single object
          const content = JSON.stringify(rawData, null, 2);
          items.push({
            id: 'dataset-item-0',
            content,
            metadata: {
              source: config.source.url,
              ontology: config.name
            }
          });
        }
      }
    }
    
    return items;
    
  } catch (error) {
    console.error('❌ Failed to download and process dataset:', error);
    return items;
  }
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--config-path':
        options.configPath = args[++i];
        break;
      case '--ontology-name':
        options.ontologyName = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
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

function showHelp() {
  console.log(`
📊 Dataset Download Test CLI

Usage: npx ts-node scripts/ontology/test-dataset-download.ts [options]

Options:
  --config-path <path>     Path to ontology config file
  --ontology-name <name>   Name of ontology (uses ontologies/<name>/config.json)
  --limit <number>         Limit number of items to show
  --help, -h              Show this help message

Examples:
  # Test FIBO dataset download
  npx ts-node scripts/ontology/test-dataset-download.ts --ontology-name fibo

  # Test with custom config
  npx ts-node scripts/ontology/test-dataset-download.ts --config-path ./custom-config.json --limit 3
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  testDatasetDownload(options).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
} 