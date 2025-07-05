#!/usr/bin/env ts-node

/*
 * Utility to demonstrate how to use partitioned prompts.
 * Usage:
 *   npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
 *        --partitions-dir=./prompt-partitions \
 *        --strategy=minimal
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

type PromptStrategy = 'minimal' | 'standard' | 'comprehensive' | 'custom';

interface PromptConfig {
  name: string;
  description: string;
  partitions: string[];
  maxTokens: number;
}

const PROMPT_STRATEGIES: Record<PromptStrategy, PromptConfig> = {
  minimal: {
    name: 'Minimal Prompt',
    description: 'Core instructions + entities + essential relationships + text',
    partitions: ['01-instructions', '02-entities', '03-relationships-01', '04-text-01'],
    maxTokens: 4000
  },
  standard: {
    name: 'Standard Prompt',
    description: 'Full instructions + all entities + first 2 relationship chunks + full text',
    partitions: ['01-instructions', '02-entities', '03-relationships-01', '03-relationships-02', '04-text-01'],
    maxTokens: 8000
  },
  comprehensive: {
    name: 'Comprehensive Prompt',
    description: 'Everything - full instructions, all entities, all relationships, all text',
    partitions: ['01-instructions', '02-entities', '03-relationships-01', '03-relationships-02', '03-relationships-03', '04-text-01', '04-text-02'],
    maxTokens: 16000
  },
  custom: {
    name: 'Custom Prompt',
    description: 'User-defined partition selection',
    partitions: ['01-instructions', '02-entities', '03-relationships-01'],
    maxTokens: 6000
  }
};

export function loadPartitionedPrompt(partitionsDir: string): {
  metadata: any;
  partitions: Map<string, string>;
  availablePartitions: string[];
} {
  if (!existsSync(partitionsDir)) {
    throw new Error(`Partitions directory not found: ${partitionsDir}`);
  }

  // Load metadata
  const metadataPath = join(partitionsDir, 'metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(`Metadata file not found: ${metadataPath}`);
  }
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

  // Load all partition files
  const partitions = new Map<string, string>();
  const availablePartitions: string[] = [];
  
  const files = readdirSync(partitionsDir);
  files.forEach(file => {
    if (file.endsWith('.txt') && file !== '00-instructions.txt' && file !== 'combined-prompt.txt') {
      const partitionName = file.replace('.txt', '');
      const content = readFileSync(join(partitionsDir, file), 'utf8');
      partitions.set(partitionName, content);
      availablePartitions.push(partitionName);
    }
  });

  return { metadata, partitions, availablePartitions };
}

export function buildPromptFromPartitions(
  partitions: Map<string, string>,
  partitionNames: string[]
): string {
  const promptParts: string[] = [];
  
  partitionNames.forEach(name => {
    const content = partitions.get(name);
    if (content) {
      promptParts.push(content);
    } else {
      console.warn(`⚠️  Partition not found: ${name}`);
    }
  });

  return promptParts.join('\n\n');
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

export function analyzePrompt(prompt: string, strategy: PromptStrategy): void {
  const tokenCount = estimateTokenCount(prompt);
  const strategyConfig = PROMPT_STRATEGIES[strategy];
  
  console.log(`\n📊 Prompt Analysis for "${strategyConfig.name}":`);
  console.log(`   Description: ${strategyConfig.description}`);
  console.log(`   Character count: ${prompt.length.toLocaleString()}`);
  console.log(`   Estimated tokens: ${tokenCount.toLocaleString()}`);
  console.log(`   Strategy max tokens: ${strategyConfig.maxTokens.toLocaleString()}`);
  
  if (tokenCount > strategyConfig.maxTokens) {
    console.log(`   ⚠️  WARNING: Token count exceeds strategy limit!`);
  } else {
    console.log(`   ✅ Token count within strategy limit`);
  }
  
  // Analyze content distribution
  const lines = prompt.split('\n');
  const entityLines = lines.filter(l => l.startsWith('- ') && !l.includes('->')).length;
  const relationshipLines = lines.filter(l => l.includes('->')).length;
  const instructionLines = lines.filter(l => l.includes('**Instructions:') || l.includes('**Output Format:')).length;
  
  console.log(`   📈 Content breakdown:`);
  console.log(`      Instructions: ${instructionLines} lines`);
  console.log(`      Entities: ${entityLines} lines`);
  console.log(`      Relationships: ${relationshipLines} lines`);
  console.log(`      Text content: ${prompt.includes('Text to Analyze') ? 'Included' : 'Not included'}`);
}

export function savePromptToFile(prompt: string, outputPath: string): void {
  const fs = require('fs');
  const path = require('path');
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, prompt);
  console.log(`💾 Prompt saved to: ${outputPath}`);
}

// --------------- CLI runner ---------------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const raw = argv.find((f) => f.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : undefined;
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`use-partitioned-prompt.ts
      --partitions-dir=<path>    Directory containing partitioned prompts
      --strategy=<name>          Prompt strategy: minimal, standard, comprehensive, custom
      --output=<path>            Output file for the generated prompt
      --list-strategies          List available strategies
      --list-partitions          List available partitions`);
    process.exit(0);
  }

  const partitionsDir = getFlag('partitions-dir');
  const strategy = getFlag('strategy') as PromptStrategy || 'standard';
  const outputPath = getFlag('output');

  if (argv.includes('--list-strategies')) {
    console.log('Available strategies:');
    Object.entries(PROMPT_STRATEGIES).forEach(([key, config]) => {
      console.log(`  ${key}: ${config.name} (${config.description})`);
    });
    process.exit(0);
  }

  if (!partitionsDir) {
    console.error('❌ Missing --partitions-dir flag');
    process.exit(1);
  }

  try {
    // Load partitioned prompt
    const { metadata, partitions, availablePartitions } = loadPartitionedPrompt(partitionsDir);

    if (argv.includes('--list-partitions')) {
      console.log('Available partitions:');
      availablePartitions.sort().forEach(partition => {
        const content = partitions.get(partition);
        console.log(`  ${partition}: ${content?.length || 0} characters`);
      });
      process.exit(0);
    }

    console.log(`📁 Loaded partitioned prompt from: ${partitionsDir}`);
    console.log(`📊 Ontology: ${metadata.ontologyName}`);
    console.log(`📧 Email: ${metadata.emailFile}`);
    console.log(`📦 Total partitions: ${metadata.partitionCount}`);

    // Get strategy configuration
    const strategyConfig = PROMPT_STRATEGIES[strategy];
    if (!strategyConfig) {
      console.error(`❌ Unknown strategy: ${strategy}`);
      console.log('Available strategies:', Object.keys(PROMPT_STRATEGIES).join(', '));
      process.exit(1);
    }

    console.log(`\n🎯 Using strategy: ${strategyConfig.name}`);
    console.log(`   Description: ${strategyConfig.description}`);

    // Build prompt from selected partitions
    const prompt = buildPromptFromPartitions(partitions, strategyConfig.partitions);
    
    // Analyze the prompt
    analyzePrompt(prompt, strategy);

    // Save or display the prompt
    if (outputPath) {
      savePromptToFile(prompt, outputPath);
    } else {
      console.log(`\n📝 Generated Prompt:`);
      console.log('='.repeat(80));
      console.log(prompt);
      console.log('='.repeat(80));
    }

  } catch (err) {
    console.error(`❌ Error: ${(err as Error).message}`);
    process.exit(1);
  }
} 