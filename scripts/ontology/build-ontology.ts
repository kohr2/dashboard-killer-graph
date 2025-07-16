#!/usr/bin/env ts-node

import { OntologyProcessor } from './cli';
import { OwlSource } from './sources/owl-source';
import { Config } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { EntityImportanceAnalyzer } from './entity-importance-analyzer';
import { EntityImportanceAnalysis } from './entity-importance-analyzer';
import { sortNamedArray, sortRecord, sortEntityProperties } from './sort-utils';
import { pruneRelationshipsByEntities } from './relationship-utils';
import { compactOntology } from './compact-ontology';
import { Entity, Relationship } from './ontology-source';

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
    // For FIBO, we want to recursively process all owl:imports
    const owlSource = new OwlSource({ ontologyKey, includeExternalImports: true });
    let processor: OntologyProcessor;
    let result: any;
    if (ontologyKey === 'fibo') {
      // Use the new recursive import extraction for FIBO
      const fiboUrl = config.source.url;
      const parsed = await owlSource.parseWithImports(fiboUrl);
      // Simulate the result structure expected by the rest of the script
      result = {
        success: true,
        sourceOntology: {
          entities: parsed.entities,
          relationships: parsed.relationships,
          ignoredEntities: [] as string[],
          ignoredRelationships: [] as string[]
        },
        metadata: config.metadata
      };
    } else {
      processor = new OntologyProcessor([owlSource]);
      // Process ontology
      console.log('🔄 Processing ontology...');
      result = await processor.processOntology(config);
    }
    
    if (!result.success) {
      console.error('❌ Failed to process ontology:', result.error);
      // In test environment, throw error instead of exiting
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        throw new Error(`Failed to process ontology: ${result.error}`);
      }
      process.exit(1);
    }
    
    console.log('✅ Ontology processed successfully!');
    
    // Debug: Check what was extracted
    console.log(`🔍 Debug: sourceOntology exists: ${!!result.sourceOntology}`);
    if (result.sourceOntology) {
      console.log(`🔍 Debug: entities count: ${result.sourceOntology.entities?.length || 0}`);
      console.log(`🔍 Debug: relationships count: ${result.sourceOntology.relationships?.length || 0}`);
      if (result.sourceOntology.entities && result.sourceOntology.entities.length > 0) {
        console.log(`🔍 Debug: sample entities: ${result.sourceOntology.entities.slice(0, 5).map((e: any) => e.name).join(', ')}`);
      }
    }
    
    // Apply optional importance-based filtering
    if (options.topEntities || options.topRelationships) {
      console.log('⚙️  Applying importance-based (LLM) filters...');
      const analyzer = new EntityImportanceAnalyzer();
      const contextDescription: string | undefined = typeof config.source?.description === 'string' ? config.source.description : undefined;
      let entityAnalysis: EntityImportanceAnalysis[] = [];
      
      if (options.topEntities && result.sourceOntology) {
        // Prepare entity data for analysis
        const entityInputs = result.sourceOntology.entities.map((e: Entity) => ({
          name: e.name,
          description: typeof e.description === 'string' ? e.description : (e.description as any)?._ || e.description || '',
          properties: e.properties || {}
        }));
        console.log(`🔍 Debug: entityInputs count: ${entityInputs.length}`);
        entityAnalysis = await analyzer.analyzeEntityImportance(entityInputs, contextDescription, options.topEntities);
        // Keep only the top entities by importance
        const topEntityNames = new Set(entityAnalysis.slice(0, options.topEntities).map(e => e.entityName));
        // Always retain core entities even if not in the topN slice
        const CORE_ENTITY_WHITELIST = new Set([
          'Buyer',
          'Organization'
        ]);
        CORE_ENTITY_WHITELIST.forEach(coreName => topEntityNames.add(coreName));

        const allEntityNames = new Set(result.sourceOntology.entities.map((e: Entity) => e.name));
        const ignoredEntities = Array.from(allEntityNames).filter((name: string) => !topEntityNames.has(name));
        result.sourceOntology.ignoredEntities = ignoredEntities;
        result.sourceOntology.entities = result.sourceOntology.entities.filter((e: Entity) => topEntityNames.has(e.name));
      }
      if (options.topRelationships && result.sourceOntology) {
        // Prepare relationship data for analysis
        const relInputs = result.sourceOntology.relationships.map((r: Relationship) => ({
          name: r.name,
          description: typeof r.description === 'string' ? r.description : (r.description as any)?._ || r.description || '',
          sourceType: r.source || 'Entity',
          targetType: r.target || 'Entity'
        }));
        const relAnalysis = await analyzer.analyzeRelationshipImportance(relInputs, contextDescription, options.topRelationships);
        // Keep only the top relationships by importance
        const topRelNames = new Set(relAnalysis.slice(0, options.topRelationships).map(r => r.relationshipName));
        const allRelNames = new Set(result.sourceOntology.relationships.map((r: Relationship) => r.name));
        const ignoredRelationships = Array.from(allRelNames).filter((name: string) => !topRelNames.has(name));
        result.sourceOntology.ignoredRelationships = ignoredRelationships;
        result.sourceOntology.relationships = result.sourceOntology.relationships.filter((r: Relationship) => topRelNames.has(r.name));
      }
      
      // Add vectorIndex property based on importance analysis
      if (entityAnalysis.length > 0 && result.finalOntology) {
        console.log('🔍 Determining vectorIndex properties based on importance analysis...');
        
        // Create a map of entity names to their importance scores
        const importanceScores = new Map<string, number>();
        entityAnalysis.forEach(analysis => {
          importanceScores.set(analysis.entityName, analysis.importanceScore);
        });
        
        // Update each entity in the final ontology
        for (const [entityName, entity] of Object.entries(result.finalOntology.entities)) {
          const hasNameProperty = entity.properties && Object.keys(entity.properties).some(propName =>
            propName.toLowerCase() === 'name' || propName.toLowerCase() === 'label'
          );
          const importanceScore = importanceScores.get(entityName) || 0;
          const isVeryImportant = importanceScore >= 0.8;

          // Context relevance: any context keyword present in entity name or description
          let contextRelevant = false;
          if (contextDescription) {
            const contextWords = contextDescription.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            const fullText = `${entityName.toLowerCase()} ${(typeof entity.description === 'string' ? entity.description : (entity.description as any)?._ || '').toLowerCase()}`;
            contextRelevant = contextWords.some(w => fullText.includes(w));
          }

          // Set vectorIndex true if entity is very important OR context relevant (and has name/label prop)
          entity.vectorIndex = hasNameProperty && (isVeryImportant || contextRelevant);

          const reason = entity.vectorIndex
            ? (isVeryImportant ? 'very important' : 'context match')
            : (!hasNameProperty ? 'no name/label property' : `low importance (score: ${importanceScore.toFixed(2)})`);

          console.log(`${entity.vectorIndex ? '  ✅' : '  ❌'} ${entityName}: vectorIndex = ${entity.vectorIndex} (${reason})`);
        }
      }
    }

    // After topRelationships filtering add relationship pruning
    if (result.sourceOntology) {
      // Prune any relationships that reference entities that are no longer present
      const allowedEntityNames = new Set(result.sourceOntology.entities.map((e: Entity) => e.name));
      const { kept: keptRels, prunedNames } = pruneRelationshipsByEntities(result.sourceOntology.relationships, allowedEntityNames);
      if (prunedNames.length > 0) {
        result.sourceOntology.relationships = keptRels;
        result.sourceOntology.ignoredRelationships = [
          ...(result.sourceOntology.ignoredRelationships || []),
          ...prunedNames
        ];
      }

      // CRITICAL ALERT: Check if all relationships were pruned
      const totalRelationships = result.sourceOntology.relationships.length + (result.sourceOntology.ignoredRelationships?.length || 0);
      if (totalRelationships > 0 && result.sourceOntology.relationships.length === 0) {
        console.error('🚨 CRITICAL ERROR: All relationships were pruned!');
        console.error(`Total relationships processed: ${totalRelationships}`);
        console.error(`Relationships kept: ${result.sourceOntology.relationships.length}`);
        console.error(`Entities available: ${result.sourceOntology.entities.length}`);
        console.error('This indicates a serious problem with entity extraction or relationship processing.');
        console.error('Possible causes:');
        console.error('  - External ontology imports not included (try --include-external)');
        console.error('  - Entity names not matching relationship source/target');
        console.error('  - OWL parsing issues');
        
        // Log some sample ignored relationships for debugging
        const sampleIgnored = result.sourceOntology.ignoredRelationships?.slice(0, 10) || [];
        console.error(`Sample ignored relationships: ${sampleIgnored.join(', ')}`);
        
        // Don't exit, but this should be investigated
        console.error('⚠️  This build should be investigated immediately!');
      }

      // Warn if more than 50% of relationships are ignored
      if (totalRelationships > 0) {
        const ignorePercentage = ((result.sourceOntology.ignoredRelationships?.length || 0) / totalRelationships) * 100;
        if (ignorePercentage > 50) {
          console.warn(`⚠️  WARNING: ${ignorePercentage.toFixed(1)}% of relationships were ignored`);
          console.warn(`  - Kept: ${result.sourceOntology.relationships.length}`);
          console.warn(`  - Ignored: ${result.sourceOntology.ignoredRelationships?.length || 0}`);
        }
      }
    }

    console.log(`📊 Entities kept: ${result.sourceOntology?.entities.length || 0}`);
    console.log(`🔗 Relationships kept: ${result.sourceOntology?.relationships.length || 0}`);
    
    // Determine output directory - create codegen directory within ontology directory
    const ontologyDir = path.dirname(configPath);
    const codegenDir = path.join(ontologyDir, 'codegen');
    
    // Create codegen directory if it doesn't exist
    if (!fs.existsSync(codegenDir)) {
      fs.mkdirSync(codegenDir, { recursive: true });
    }
    
    const outputDir = options.outputDir || codegenDir;
    
    // Save source ontology (raw extraction)
    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    const isValidEntityName = (name: string) => {
      // Must start with a letter, underscore, or dollar sign
      if (!name || name.length === 0) return false;
      if (/^\d+$/.test(name)) return false;
      if (!/^[a-zA-Z_$]/.test(name)) return false;
      if (!/^[a-zA-Z0-9_$]+$/.test(name)) return false;
      const reservedKeywords = [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
      ];
      if (reservedKeywords.includes(name)) return false;
      return true;
    };
    const filteredEntities = result.sourceOntology?.entities ? result.sourceOntology.entities.filter((e: Entity) => isValidEntityName(e.name)) : [];

    // Alphabetically sort ignored lists (deduplicated)
    const alpha = (arr: string[] = []) => [...new Set(arr)].sort((a, b) => a.localeCompare(b));

    const sourceOntology = {
      name: config.name,
      source: config.source,
      entities: sortNamedArray(filteredEntities),
      relationships: result.sourceOntology?.relationships ? sortNamedArray(result.sourceOntology.relationships) : [],
      metadata: result.metadata,
      ignoredEntities: alpha(result.sourceOntology?.ignoredEntities),
      ignoredRelationships: alpha(result.sourceOntology?.ignoredRelationships)
    };
    
    fs.writeFileSync(sourceOntologyPath, JSON.stringify(sourceOntology, null, 2));
    console.log(`💾 Source ontology saved to: ${sourceOntologyPath}`);
    
    // Generate compact ontology
    // Convert to the format expected by compactOntology function
    const compactOntologyInput = {
      entities: sourceOntology.entities.map((entity: any) => ({
        name: entity.name,
        description: typeof entity.description === 'string' ? entity.description : (entity.description as any)?._ || '',
        properties: Object.keys(entity.properties || {})
      })),
      relationships: sourceOntology.relationships.map((rel: any) => ({
        source: rel.source,
        target: rel.target,
        type: rel.name,
        name: rel.name,
        description: typeof rel.description === 'string' ? rel.description : (rel.description as any)?._ || ''
      }))
    };
    
    const compactOntologyData = compactOntology(compactOntologyInput);
    const compactOntologyPath = path.join(outputDir, 'ontology.compact.json');
    fs.writeFileSync(compactOntologyPath, JSON.stringify(compactOntologyData, null, 2));
    console.log(`💾 Compact ontology saved to: ${compactOntologyPath}`);
    
    // Also update the main ontology.json file in the ontology directory
    const mainOntologyPath = path.join(ontologyDir, 'ontology.json');
    fs.writeFileSync(mainOntologyPath, JSON.stringify(sourceOntology, null, 2));
    console.log(`💾 Main ontology updated: ${mainOntologyPath}`);
    
    // Note: source.ontology.json and ontology.compact.json are also generated in codegen/ directory
    
    // Display sample entities
    if (result.sourceOntology?.entities.length) {
      console.log('\n📋 Sample entities:');
      result.sourceOntology.entities.slice(0, 5).forEach((entity: any) => {
        const description = typeof entity.description === 'string' 
          ? entity.description 
          : (entity.description as any)?._ || entity.description;
        console.log(`  - ${entity.name}: ${description?.substring(0, 80)}${description?.length > 80 ? '...' : ''}`);
      });
    }
    
    // Display sample relationships
    if (result.sourceOntology?.relationships.length) {
      console.log('\n🔗 Sample relationships:');
      result.sourceOntology.relationships.slice(0, 5).forEach((rel: any) => {
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