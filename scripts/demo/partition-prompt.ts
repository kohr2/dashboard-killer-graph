#!/usr/bin/env ts-node

/*
 * Utility to partition the LLM prompt into manageable chunks.
 * Usage:
 *   npx ts-node -T -r tsconfig-paths/register -r reflect-metadata scripts/demo/partition-prompt.ts \
 *        --ontology=procurement \
 *        --email=test/fixtures/procurement/emails/001-contract-award-abc-corp.eml \
 *        --output-dir=./prompt-partitions
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, isAbsolute, dirname } from 'path';
import { registerSelectedOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { buildOntologySyncPayload, OntologySyncPayload } from '@platform/processing/content-processing.service';

interface PromptPartition {
  name: string;
  content: string;
  size: number;
  description: string;
}

interface PartitionedPrompt {
  metadata: {
    ontologyName: string;
    emailFile: string;
    totalSize: number;
    partitionCount: number;
    generatedAt: string;
  };
  partitions: PromptPartition[];
  instructions: string;
}

export function partitionPrompt(ontologyName: string, emailFile: string, maxPartitionSize: number = 4000): PartitionedPrompt {
  if (!ontologyName) {
    throw new Error('Missing --ontology=<name> flag');
  }
  if (!emailFile) {
    throw new Error('Missing --email=<path>.eml flag');
  }

  // Register only the requested ontology (plus core)
  registerSelectedOntologies([ontologyName]);

  // Resolve ontology service & build sync payload
  const ontologyService = container.resolve(OntologyService);
  const payload = buildOntologySyncPayload(ontologyService);

  const resolvedEmailPath = isAbsolute(emailFile)
    ? emailFile
    : join(process.cwd(), emailFile);
  const emailText = readFileSync(resolvedEmailPath, 'utf8');

  // Filter out generic relationships (Entity->Entity patterns)
  const filteredRelationships = (payload.relationship_patterns || [])
    .filter((pattern: string) => {
      // Robustly extract source, relationship, target
      const dashIdx = pattern.indexOf('-');
      const arrowIdx = pattern.lastIndexOf('->');
      if (dashIdx === -1 || arrowIdx === -1 || arrowIdx <= dashIdx) return true;
      const sourceType = pattern.substring(0, dashIdx);
      const relationshipName = pattern.substring(dashIdx + 1, arrowIdx);
      const targetType = pattern.substring(arrowIdx + 2);
      
      // Skip if both source and target are generic "Entity"
      if (sourceType === 'Entity' && targetType === 'Entity') {
        return false;
      }
      // Skip relationships involving generic entity types
      const genericEntityTypes = ['Thing', 'UnrecognizedEntity'];
      if (genericEntityTypes.includes(sourceType) || genericEntityTypes.includes(targetType)) {
        return false;
      }
      // Skip very generic relationship names
      const genericNames = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
      if (genericNames.includes(relationshipName)) {
        return false;
      }
      return true;
    });

  const entityLines = payload.entity_types
    .filter((e: string) => !payload.property_types.includes(e))
    .filter((e: string) => !['Thing', 'UnrecognizedEntity'].includes(e))
    .map((e: string) => `- ${e}`)
    .join('\n');

  const relationshipLines = filteredRelationships
    .map((r: string) => `- ${r}`)
    .join('\n');

  // Create partitions
  const partitions: PromptPartition[] = [];
  let totalSize = 0;

  // Partition 1: Instructions and Core Setup
  const instructions = `You are an expert financial analyst creating a knowledge graph from a text. Your goal is to extract entities and relationships to build a graph. Your final output must be a single JSON object with "entities" and "relationships" keys.

**Instructions:**
1. Analyze the provided text carefully
2. Extract entities that match the ontology types
3. Identify relationships between entities using the provided patterns
4. Return a JSON object with "entities" and "relationships" arrays
5. Each entity should have: value, type, properties
6. Each relationship should have: source, target, type

**Output Format:**
{
  "entities": [
    {
      "value": "entity name",
      "type": "entity type",
      "properties": {}
    }
  ],
  "relationships": [
    {
      "source": "source entity value",
      "target": "target entity value", 
      "type": "relationship type"
    }
  ]
}`;

  partitions.push({
    name: '01-instructions',
    content: instructions,
    size: instructions.length,
    description: 'Core instructions and output format'
  });
  totalSize += instructions.length;

  // Partition 2: Entity Types
  const entityPartition = `**Ontology Entities:**\n${entityLines}`;
  partitions.push({
    name: '02-entities',
    content: entityPartition,
    size: entityPartition.length,
    description: `Entity types (${payload.entity_types.filter(e => !payload.property_types.includes(e)).length} entities)`
  });
  totalSize += entityPartition.length;

  // Partition 3: Relationship Patterns (split if too large)
  const relationshipChunks = chunkArray(filteredRelationships, Math.ceil(filteredRelationships.length / Math.ceil(relationshipLines.length / maxPartitionSize)));
  
  relationshipChunks.forEach((chunk, index) => {
    const chunkContent = `**Ontology Relationships:**\n${chunk.map(r => `- ${r}`).join('\n')}`;
    partitions.push({
      name: `03-relationships-${String(index + 1).padStart(2, '0')}`,
      content: chunkContent,
      size: chunkContent.length,
      description: `Relationship patterns (${chunk.length} relationships)`
    });
    totalSize += chunkContent.length;
  });

  // Partition 4: Text Content (split if too large)
  const textChunks = chunkText(emailText, maxPartitionSize);
  textChunks.forEach((chunk, index) => {
    const chunkContent = `**Text to Analyze (Part ${index + 1}/${textChunks.length}):**\n---\n${chunk}\n---`;
    partitions.push({
      name: `04-text-${String(index + 1).padStart(2, '0')}`,
      content: chunkContent,
      size: chunkContent.length,
      description: `Email text content (${chunk.length} characters)`
    });
    totalSize += chunkContent.length;
  });

  return {
    metadata: {
      ontologyName,
      emailFile,
      totalSize,
      partitionCount: partitions.length,
      generatedAt: new Date().toISOString()
    },
    partitions,
    instructions
  };
}

function chunkArray<T>(array: T[], numChunks: number): T[][] {
  const chunks: T[][] = [];
  const chunkSize = Math.ceil(array.length / numChunks);
  
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
}

function chunkText(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export function savePartitionedPrompt(partitioned: PartitionedPrompt, outputDir: string): void {
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Save metadata
  writeFileSync(
    join(outputDir, 'metadata.json'),
    JSON.stringify(partitioned.metadata, null, 2)
  );

  // Save instructions
  writeFileSync(
    join(outputDir, '00-instructions.txt'),
    partitioned.instructions
  );

  // Save each partition
  partitioned.partitions.forEach(partition => {
    writeFileSync(
      join(outputDir, `${partition.name}.txt`),
      partition.content
    );
  });

  // Save combined prompt (for reference)
  const combinedPrompt = [
    partitioned.instructions,
    ...partitioned.partitions.map(p => p.content)
  ].join('\n\n');
  
  writeFileSync(
    join(outputDir, 'combined-prompt.txt'),
    combinedPrompt
  );

  // Save summary
  const summary = `Prompt Partitioning Summary
=======================

Ontology: ${partitioned.metadata.ontologyName}
Email: ${partitioned.metadata.emailFile}
Total Size: ${partitioned.metadata.totalSize} characters
Partitions: ${partitioned.metadata.partitionCount}
Generated: ${partitioned.metadata.generatedAt}

Partitions:
${partitioned.partitions.map(p => 
  `${p.name}: ${p.description} (${p.size} chars)`
).join('\n')}

Usage Instructions:
1. Start with 00-instructions.txt for the core setup
2. Include 02-entities.txt for entity types
3. Include relevant 03-relationships-*.txt files for relationship patterns
4. Include relevant 04-text-*.txt files for the content to analyze
5. Combine in order to create the final prompt

Note: The combined-prompt.txt contains the full prompt for reference.`;
  
  writeFileSync(
    join(outputDir, 'README.md'),
    summary
  );
}

function loadCompactOntology(compactOntologyPath: string) {
  const data = JSON.parse(readFileSync(compactOntologyPath, 'utf-8'));
  return {
    entity_types: data.e,
    relationship_patterns: data.r.map((arr: [string, string, string]) => `${arr[0]}-${arr[1]}->${arr[2]}`)
  };
}

export function generateSinglePrompt(ontologyName: string, emailFile: string, compactOntologyPath?: string): string {
  let payload: any;
  let usingCompact = false;
  if (compactOntologyPath) {
    payload = loadCompactOntology(compactOntologyPath);
    usingCompact = true;
  } else {
    // Register only the requested ontology (plus core)
    registerSelectedOntologies([ontologyName]);
    // Resolve ontology service & build sync payload
    const ontologyService = container.resolve(OntologyService);
    payload = buildOntologySyncPayload(ontologyService);
  }

  const resolvedEmailPath = isAbsolute(emailFile)
    ? emailFile
    : join(process.cwd(), emailFile);
  const emailText = readFileSync(resolvedEmailPath, 'utf8');

  // Filter out generic relationships (Entity->Entity patterns)
  const filteredRelationships = (payload.relationship_patterns || [])
    .filter((pattern: string) => {
      // Robustly extract source, relationship, target
      const dashIdx = pattern.indexOf('-');
      const arrowIdx = pattern.lastIndexOf('->');
      if (dashIdx === -1 || arrowIdx === -1 || arrowIdx <= dashIdx) return true;
      const sourceType = pattern.substring(0, dashIdx);
      const relationshipName = pattern.substring(dashIdx + 1, arrowIdx);
      const targetType = pattern.substring(arrowIdx + 2);
      // Skip if both source and target are generic "Entity"
      if (sourceType === 'Entity' && targetType === 'Entity') {
        return false;
      }
      // Skip relationships involving generic entity types
      const genericEntityTypes = ['Thing', 'UnrecognizedEntity'];
      if (genericEntityTypes.includes(sourceType) || genericEntityTypes.includes(targetType)) {
        return false;
      }
      // Skip very generic relationship names
      const genericNames = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
      if (genericNames.includes(relationshipName)) {
        return false;
      }
      // Skip relationships where source and target are the same (self-referential)
      if (sourceType === targetType) {
        return false;
      }
      return true;
    });

  const entityLines = (payload.entity_types || [])
    .filter((e: string) => !['Thing', 'UnrecognizedEntity'].includes(e))
    .map((e: string) => `- ${e}`)
    .join('\n');

  const relationshipLines = filteredRelationships
    .map((r: string) => `- ${r}`)
    .join('\n');

  const ontologyExplanation = usingCompact
    ? `Ontology format:\n- "e" is the list of entity types.\n- "r" is the list of relationships, each as [source_entity, relationship_type, target_entity].\n` : '';

  const instructions = `You are an expert financial analyst creating a knowledge graph from a text. Your goal is to extract entities and relationships to build a graph. Your final output must be a single JSON object with "entities" and "relationships" keys.\n\n**Instructions:**\n1. Analyze the provided text carefully\n2. Extract entities that match the ontology types\n3. Identify relationships between entities using the provided patterns\n4. Return a JSON object with "entities" and "relationships" arrays\n5. Each entity should have: value, type, properties\n6. Each relationship should have: source, target, type\n\n**Output Format:**\n{\n  "entities": [\n    {\n      "value": "entity name",\n      "type": "entity type",\n      "properties": {}\n    }\n  ],\n  "relationships": [\n    {\n      "source": "source entity value",\n      "target": "target entity value", \n      "type": "relationship type"\n    }\n  ]\n}`;

  return `${instructions}\n\n${usingCompact ? ontologyExplanation : ''}**Ontology Entities:**\n${entityLines}\n\n**Ontology Relationships:**\n${relationshipLines}\n\n**Text to Analyze:**\n---\n${emailText}\n---`;
}

// --------------- CLI runner ---------------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const raw = argv.find((f) => f.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : undefined;
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`partition-prompt.ts\n      --ontology=<name>       Ontology plugin name (e.g., procurement)\n      --email=<path>          Path to .eml file to analyse\n      --output-dir=<path>     Output directory for partitions (default: ./prompt-partitions)\n      --max-size=<number>     Maximum partition size in characters (default: 4000)\n      --single-file=<path>    Generate a single prompt file instead of partitions\n      --compact-ontology=<path>  Use a compact ontology JSON file (overrides --ontology)`);
    process.exit(0);
  }

  const ontologyName = getFlag('ontology');
  const emailPath = getFlag('email');
  const outputDir = getFlag('output-dir') || './prompt-partitions';
  const maxSize = parseInt(getFlag('max-size') || '4000');
  const singleFilePath = getFlag('single-file');
  const compactOntologyPath = getFlag('compact-ontology');

  try {
    if (singleFilePath) {
      // Generate single prompt file
      const singlePrompt = generateSinglePrompt(ontologyName as string, emailPath as string, compactOntologyPath);
      writeFileSync(singleFilePath, singlePrompt);
      
      console.log(`✅ Single prompt file generated successfully!`);
      console.log(`📄 Output file: ${singleFilePath}`);
      console.log(`📊 Total size: ${singlePrompt.length} characters`);
      console.log(`\n💡 You can now copy this file content and paste it into ChatGPT or another LLM.`);
      
    } else {
      // Generate partitioned prompt
      const partitioned = partitionPrompt(ontologyName as string, emailPath as string, maxSize);
      savePartitionedPrompt(partitioned, outputDir);
      
      console.log(`✅ Prompt partitioned successfully!`);
      console.log(`📁 Output directory: ${outputDir}`);
      console.log(`📊 Total size: ${partitioned.metadata.totalSize} characters`);
      console.log(`📦 Partitions: ${partitioned.metadata.partitionCount}`);
      console.log(`\n📋 Partitions:`);
      partitioned.partitions.forEach(p => {
        console.log(`   ${p.name}: ${p.description} (${p.size} chars)`);
      });
      console.log(`\n📖 See ${outputDir}/README.md for usage instructions`);
    }
    
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
} 