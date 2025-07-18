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

        const allEntityNames = new Set<string>(result.sourceOntology.entities.map((e: Entity) => e.name));
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
        const allRelNames = new Set<string>(result.sourceOntology.relationships.map((r: Relationship) => r.name));
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
          const entityObj = entity as any;
          const hasNameProperty = entityObj.properties && Object.keys(entityObj.properties).some((propName: string) =>
            propName.toLowerCase() === 'name' || propName.toLowerCase() === 'label'
          );
          const importanceScore = importanceScores.get(entityName) || 0;
          const isVeryImportant = importanceScore >= 0.8;

          // Context relevance: any context keyword present in entity name or description
          let contextRelevant = false;
          if (contextDescription) {
            const contextWords = contextDescription.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            const fullText = `${entityName.toLowerCase()} ${(typeof entityObj.description === 'string' ? entityObj.description : (entityObj.description as any)?._ || '').toLowerCase()}`;
            contextRelevant = contextWords.some(w => fullText.includes(w));
          }

          // Set vectorIndex true if entity is very important OR context relevant (and has name/label prop)
          entityObj.vectorIndex = hasNameProperty && (isVeryImportant || contextRelevant);

          const reason = entityObj.vectorIndex
            ? (isVeryImportant ? 'very important' : 'context match')
            : (!hasNameProperty ? 'no name/label property' : `low importance (score: ${importanceScore.toFixed(2)})`);

          console.log(`${entityObj.vectorIndex ? '  ✅' : '  ❌'} ${entityName}: vectorIndex = ${entityObj.vectorIndex} (${reason})`);
        }
      }
    }

    // After topRelationships filtering add relationship pruning
    if (result.sourceOntology) {
      // Prune any relationships that reference entities that are no longer present
      const allowedEntityNames = new Set<string>(result.sourceOntology.entities.map((e: Entity) => e.name));
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
    
    // Generate prompts based on ontology analysis
    console.log('🤖 Generating prompts based on ontology analysis...');
    const generatedPrompts = generatePromptsFromOntology(sourceOntology, config);
    
    // Update config with generated prompts
    const updatedConfig = {
      ...config,
      prompts: generatedPrompts
    };
    
    // Save updated config
    const updatedConfigPath = path.join(ontologyDir, 'config.json');
    fs.writeFileSync(updatedConfigPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`💾 Updated config with generated prompts: ${updatedConfigPath}`);
    
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

/**
 * Generate ontology-specific prompts by analyzing the ontology structure
 */
function generatePromptsFromOntology(ontology: any, config: any) {
  const ontologyName = config.name;
  const ontologyDescription = config.source.description;
  
  // Analyze entity types for semantic groupings
  const entityTypes = ontology.entities.map((e: any) => e.name);
  const personEntities = entityTypes.filter((name: string) => 
    name.toLowerCase().includes('person') || 
    name.toLowerCase().includes('agent') || 
    name.toLowerCase().includes('buyer') || 
    name.toLowerCase().includes('tenderer') ||
    name.toLowerCase().includes('contractor') ||
    name.toLowerCase().includes('contact')
  );
  
  const organizationEntities = entityTypes.filter((name: string) => 
    name.toLowerCase().includes('organization') || 
    name.toLowerCase().includes('company') || 
    name.toLowerCase().includes('business') ||
    name.toLowerCase().includes('vendor') ||
    name.toLowerCase().includes('supplier')
  );
  
  const contractEntities = entityTypes.filter((name: string) => 
    name.toLowerCase().includes('contract') || 
    name.toLowerCase().includes('agreement') || 
    name.toLowerCase().includes('deal') ||
    name.toLowerCase().includes('tender') ||
    name.toLowerCase().includes('award')
  );
  
  const documentEntities = entityTypes.filter((name: string) => 
    name.toLowerCase().includes('document') || 
    name.toLowerCase().includes('form') || 
    name.toLowerCase().includes('report') ||
    name.toLowerCase().includes('specification') ||
    name.toLowerCase().includes('proposal')
  );
  
  const projectEntities = entityTypes.filter((name: string) => 
    name.toLowerCase().includes('project') || 
    name.toLowerCase().includes('process') || 
    name.toLowerCase().includes('work') ||
    name.toLowerCase().includes('task') ||
    name.toLowerCase().includes('activity')
  );
  
  // Generate semantic mappings for query translation
  const semanticMappings: { [key: string]: string[] } = {};
  
  if (personEntities.length > 0) {
    semanticMappings['persons'] = personEntities;
    semanticMappings['people'] = personEntities;
    semanticMappings['agents'] = personEntities;
  }
  
  if (organizationEntities.length > 0) {
    semanticMappings['companies'] = organizationEntities;
    semanticMappings['organizations'] = organizationEntities;
    semanticMappings['vendors'] = organizationEntities;
  }
  
  if (contractEntities.length > 0) {
    semanticMappings['contracts'] = contractEntities;
    semanticMappings['agreements'] = contractEntities;
    semanticMappings['deals'] = contractEntities;
  }
  
  if (documentEntities.length > 0) {
    semanticMappings['documents'] = documentEntities;
    semanticMappings['forms'] = documentEntities;
    semanticMappings['reports'] = documentEntities;
  }
  
  if (projectEntities.length > 0) {
    semanticMappings['projects'] = projectEntities;
    semanticMappings['processes'] = projectEntities;
    semanticMappings['activities'] = projectEntities;
  }
  
  // Generate query translation prompts
  const queryTranslationPrompts = {
    systemPrompt: `You are an expert at translating natural language queries into a structured JSON format for the ${ontologyName} domain.

Your task is to identify the user's intent and the target resource, considering the conversational history and the graph schema.

You have three commands:
1. 'show': For listing all resources of a certain type.
2. 'show_related': For listing resources related to the entities from the previous turn in the conversation, or for complex self-contained relational queries.
3. 'unknown': For anything else (greetings, general questions, etc.).

The supported resource types are: {validEntityTypes}
Available labels (including alternative labels): {availableLabels}
The user can write in any language.

# Rules:
- If the query is a stand-alone request (e.g., "show all deals"), use the 'show' command and populate 'resourceTypes'.
- If the query requests resources with specific properties (e.g., "find the person named Rick"), use the 'show' command and populate 'resourceTypes' and 'filters'.
- For a complex query that finds entities related to another entity described by properties (e.g., "find companies related to 'John Doe'"), use the 'show_related' command. You must populate 'resourceTypes' with the target entity type, 'relatedTo' with the source entity type, and 'filters' with the properties of the source entity.
- If the query refers to a previous result (e.g., "show their contacts"), use the 'show_related' command. You MUST set 'resourceTypes' to the type(s) of entity the user is asking for now. The 'relatedTo' field will be inferred from the context.
- For 'show_related', if you can't determine the new resourceTypes, classify the command as 'unknown'.
- If the query refers to a *specific entity* from the history (e.g., "who is related to 'Project Alpha'"), you MUST also extract the 'sourceEntityName'.
- When using 'show_related', only infer a 'relationshipType' if the user's language is very specific (e.g., "who works on", "invested in"). Otherwise, omit it.
- If there's no history or the query doesn't relate to it, treat it as a new query.
- IMPORTANT: When the user uses alternative labels (like "Person" instead of "Contact"), map them to the correct entity types. For example, if "Person" is an alternative label for "Contact", use "Contact" in the resourceTypes.

# Graph Schema
This is the structure of the knowledge graph you are querying:
{schemaDescription}

# Conversation History
{previousContext}

# Output Format
Provide the output in JSON format: {"command": "...", "resourceTypes": ["...", "..."], "filters": {"key": "value"}, "relatedTo": ["..."], "sourceEntityName": "...", "relationshipType": "..."}.
'filters', 'relatedTo', 'sourceEntityName' and 'relationshipType' are optional.`,
    
    semanticPrompt: `You are an expert at analyzing ontology entities and creating semantic mappings for natural language queries in the ${ontologyName} domain.

Given these ontology entities:
{entityDescriptions}

Your task is to identify common natural language terms that users might use to refer to groups of these entities, and map them to the appropriate entity types.

CRITICAL REQUIREMENTS:
1. You MUST include mappings for these essential terms if relevant entities exist:
   - "persons" and "people" → all person/agent related entities
   - "agents" → agent-related entities  
   - "companies" and "organizations" → business/organization entities
   - "contracts" → contract/agreement entities
   - "projects" → project/process related entities
   - "documents" → document related entities

2. Analyze the entity names and descriptions to identify semantic groupings
3. Consider alternative labels and common synonyms
4. Map plural forms (e.g., "persons", "people", "agents", "companies")
5. Be comprehensive - include all relevant entity types for each semantic category

Generate mappings in this JSON format:
{
  "common_term": ["entity_type1", "entity_type2"],
  "another_term": ["entity_type3", "entity_type4"]
}

Be thorough and include all relevant mappings. Users should be able to query using natural language terms.

Return only the JSON object, no other text.`,
    
    semanticMappings
  };
  
  // Generate email generation prompts
  const emailGenerationPrompts = {
    systemPrompt: `You are a professional email writer specializing in ${ontologyName} communications. Always respond with SUBJECT: and BODY: sections. 

CRITICAL INSTRUCTIONS:
- You MUST use the provided ontology entities and relationships naturally in your email content
- Reference specific entity names (like ${entityTypes.slice(0, 5).join(', ')}) in context
- Reference specific relationship names naturally in context
- Make the email content rich with domain-specific terminology
- Ensure the email sounds professional and realistic for the ${ontologyName} domain
- Use the exact entity and relationship names provided in the ontology context`,
    
    promptTemplate: `You are {senderName}, {senderTitle} at the {ontologyName} department. Generate a professional email for {emailType} regarding {category} with vendor {vendor}.

Ontology Context:
- Name: {ontologyName}
- Source: {ontologyDescription}
- Version: {ontologyVersion}

Relevant Entities from this ontology (use these entity names naturally in your email):
{entityInfo}

Relevant Relationships from this ontology (use these relationship names naturally in your email):
{relationshipInfo}

Email Context:
- Email Type: {emailType}
- Vendor: {vendor}
- Category: {category}
- Reference Number: {referenceNumber}
- Amount: {amount} {currency}
- Date: {date}
- Sender: {senderName} ({senderTitle})
- Recipient: {recipientName} ({recipientTitle})

Requirements:
- Generate both a subject line and email body
- Keep the email professional and concise (under 300 words)
- Use appropriate tone for {ontologyName} operations
- Include relevant details like reference numbers and amounts
- CRITICAL: Reference between 8-12 specific entities from the ontology naturally in your email (use the exact entity names listed above)
- CRITICAL: Reference at least 2-4 specific relationships from the ontology naturally in your email (use the exact relationship names listed above)
- Make the email content rich with ${ontologyName}-specific terminology and concepts
- Include specific ${ontologyName} processes, roles, documents, or procedures mentioned in the entities
- End with appropriate signature including sender's name and title
- Address the recipient by their name
- Make the email realistic and contextually appropriate for ${ontologyName} operations

Format your response as:
SUBJECT: [subject line]
BODY: [email body]`
  };
  
  return {
    queryTranslation: queryTranslationPrompts,
    emailGeneration: emailGenerationPrompts
  };
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