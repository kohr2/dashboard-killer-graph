#!/usr/bin/env ts-node

import { OntologyProcessor } from './cli';
import { OwlSource } from './sources/owl-source';
import { Config } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { EntityImportanceAnalyzer } from './entity-importance-analyzer';

interface BuildOptions {
  configPath?: string;
  ontologyName?: string;
  outputDir?: string;
  topEntities?: number;
  topRelationships?: number;
  includeExternal?: boolean;
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
    const ontologyKey = options.ontologyName?.toLowerCase();
    const owlSource = new OwlSource({ ontologyKey, includeExternalImports: options.includeExternal });
    const processor = new OntologyProcessor([owlSource]);
    
    // Process ontology
    console.log('🔄 Processing ontology...');
    const result = await processor.processOntology(config);
    
    if (!result.success) {
      console.error('❌ Failed to process ontology:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Ontology processed successfully!');
    
    // Apply optional importance-based filtering
    if (options.topEntities || options.topRelationships) {
      console.log('⚙️  Applying importance-based (LLM) filters...');
      const analyzer = new EntityImportanceAnalyzer();
      if (options.topEntities && result.sourceOntology) {
        // Prepare entity data for analysis
        const entityInputs = result.sourceOntology.entities.map(e => ({
          name: e.name,
          description: typeof e.description === 'string' ? e.description : (e.description as any)?._ || e.description || '',
          properties: e.properties || {}
        }));
        // Analyze importance
        const entityAnalysis = await analyzer.analyzeEntityImportance(entityInputs, undefined, options.topEntities);
        // Keep only the top entities by importance
        const topEntityNames = new Set(entityAnalysis.slice(0, options.topEntities).map(e => e.entityName));
        const allEntityNames = new Set(result.sourceOntology.entities.map(e => e.name));
        const ignoredEntities = Array.from(allEntityNames).filter(name => !topEntityNames.has(name));
        result.sourceOntology.ignoredEntities = ignoredEntities;
        result.sourceOntology.entities = result.sourceOntology.entities.filter(e => topEntityNames.has(e.name));
      }
      if (options.topRelationships && result.sourceOntology) {
        // Prepare relationship data for analysis
        const relInputs = result.sourceOntology.relationships.map(r => ({
          name: r.name,
          description: typeof r.description === 'string' ? r.description : (r.description as any)?._ || r.description || '',
          sourceType: r.source || 'Entity',
          targetType: r.target || 'Entity'
        }));
        // Analyze importance
        const relAnalysis = await analyzer.analyzeRelationshipImportance(relInputs, undefined, options.topRelationships);
        // Keep only the top relationships by importance
        const topRelNames = new Set(relAnalysis.slice(0, options.topRelationships).map(r => r.relationshipName));
        const allRelNames = new Set(result.sourceOntology.relationships.map(r => r.name));
        const ignoredRelationships = Array.from(allRelNames).filter(name => !topRelNames.has(name));
        result.sourceOntology.ignoredRelationships = ignoredRelationships;
        result.sourceOntology.relationships = result.sourceOntology.relationships.filter(r => topRelNames.has(r.name));
      }
    }

    console.log(`📊 Entities kept: ${result.sourceOntology?.entities.length || 0}`);
    console.log(`🔗 Relationships kept: ${result.sourceOntology?.relationships.length || 0}`);
    
    // Determine output directory
    const outputDir = options.outputDir || path.dirname(configPath);
    
    // Save source ontology (raw extraction)
    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    const sourceOntology = {
      name: config.name,
      source: config.source,
      entities: result.sourceOntology?.entities || [],
      relationships: result.sourceOntology?.relationships || [],
      metadata: result.metadata,
      ignoredEntities: result.sourceOntology?.ignoredEntities || [],
      ignoredRelationships: result.sourceOntology?.ignoredRelationships || []
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
      case '--top-entities':
        options.topEntities = parseInt(args[++i], 10);
        break;
      case '--top-relationships':
        options.topRelationships = parseInt(args[++i], 10);
        break;
      case '--include-external':
        options.includeExternal = true;
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
  --top-entities <n>      Keep only the <n> most popular entities (popularity = number of relationships)
  --top-relationships <n> Keep only the <n> most popular relationships (simple heuristic)
  --include-external      Include external imports
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