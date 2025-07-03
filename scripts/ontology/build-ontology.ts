#!/usr/bin/env ts-node

import { OntologyProcessor } from './cli';
import { OwlSource } from './sources/owl-source';
import { Config } from './config';
import * as fs from 'fs';
import * as path from 'path';

interface BuildOptions {
  configPath?: string;
  ontologyName?: string;
  outputDir?: string;
}

async function buildOntology(options: BuildOptions = {}) {
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
    
    // Update extraction timestamp
    config.metadata.lastExtraction = new Date().toISOString();
    
    console.log(`🏗️  Building ontology: ${config.name}`);
    console.log(`📋 Config loaded from: ${configPath}`);
    console.log(`🔗 Source: ${config.source.url}`);
    console.log(`📝 Description: ${config.source.description}`);
    
    // Initialize processor with available sources
    const owlSource = new OwlSource();
    const processor = new OntologyProcessor([owlSource]);
    
    // Process ontology
    console.log('🔄 Processing ontology...');
    const result = await processor.processOntology(config);
    
    if (!result.success) {
      console.error('❌ Failed to process ontology:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Ontology processed successfully!');
    console.log(`📊 Entities extracted: ${result.metadata?.entityCount || 0}`);
    console.log(`🔗 Relationships extracted: ${result.metadata?.relationshipCount || 0}`);
    
    // Determine output directory
    const outputDir = options.outputDir || path.dirname(configPath);
    
    // Save source ontology (raw extraction)
    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    const sourceOntology = {
      name: config.name,
      source: config.source,
      entities: result.sourceOntology?.entities || [],
      relationships: result.sourceOntology?.relationships || [],
      metadata: result.metadata
    };
    
    fs.writeFileSync(sourceOntologyPath, JSON.stringify(sourceOntology, null, 2));
    console.log(`💾 Source ontology saved to: ${sourceOntologyPath}`);
    
    // Save final ontology (with overrides applied)
    const finalOntologyPath = path.join(outputDir, 'ontology.json');
    const finalOntology = {
      name: config.name,
      source: config.source,
      entities: result.finalOntology?.entities || {},
      relationships: result.finalOntology?.relationships || {},
      metadata: result.metadata
    };
    
    fs.writeFileSync(finalOntologyPath, JSON.stringify(finalOntology, null, 2));
    console.log(`💾 Final ontology saved to: ${finalOntologyPath}`);
    
    // Display sample entities
    if (result.sourceOntology?.entities.length) {
      console.log('\n📋 Sample entities:');
      result.sourceOntology.entities.slice(0, 5).forEach(entity => {
        const description = typeof entity.description === 'string' 
          ? entity.description 
          : (entity.description as any)?._ || entity.description;
        console.log(`  - ${entity.name}: ${description?.substring(0, 80)}${description?.length > 80 ? '...' : ''}`);
      });
    }
    
    // Display sample relationships
    if (result.sourceOntology?.relationships.length) {
      console.log('\n🔗 Sample relationships:');
      result.sourceOntology.relationships.slice(0, 5).forEach(rel => {
        console.log(`  - ${rel.name}: ${rel.source} -> ${rel.target}`);
      });
    }
    
    console.log('\n🎉 Ontology build completed!');
    
  } catch (error) {
    console.error('❌ Error building ontology:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config-path':
        options.configPath = args[++i];
        break;
      case '--ontology-name':
        options.ontologyName = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`❌ Unknown option: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🏗️  Generic Ontology Builder

Usage:
  npx ts-node scripts/ontology/build-ontology.ts [options]

Options:
  --config-path <path>     Path to the ontology config file
  --ontology-name <name>   Name of ontology (looks for ontologies/<name>/config.json)
  --output-dir <path>      Output directory (defaults to config file directory)
  --help, -h              Show this help message

Examples:
  # Build procurement ontology by name
  npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement

  # Build with custom config path
  npx ts-node scripts/ontology/build-ontology.ts --config-path ./custom-config.json

  # Build with custom output directory
  npx ts-node scripts/ontology/build-ontology.ts --ontology-name financial --output-dir ./output
`);
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  buildOntology(options);
}

export { buildOntology }; 