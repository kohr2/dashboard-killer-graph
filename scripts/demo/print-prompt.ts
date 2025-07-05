#!/usr/bin/env ts-node

/*
 * Utility to print the full LLM prompt for a single email and a single ontology.
 * Usage:
 *   npx ts-node -T -r tsconfig-paths/register -r reflect-metadata scripts/demo/print-prompt.ts \
 *        --ontology=procurement \
 *        --email=test/fixtures/procurement/emails/001-contract-award-abc-corp.eml
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { readFileSync } from 'fs';
import { join, isAbsolute } from 'path';
import { registerSelectedOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { buildOntologySyncPayload } from '@platform/processing/content-processing.service';

export function buildPrompt(ontologyName: string, emailFile: string): string {
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

  const entityLines = payload.entity_types
    .filter((e) => !payload.property_types.includes(e))
    .map((e) => `- ${e}`)
    .join('\n');

  const relationshipLines = (
    payload.relationship_patterns && payload.relationship_patterns.length
      ? payload.relationship_patterns
      : payload.relationship_types
  )
    .map((r) => `- ${r}`)
    .join('\n');

  const resolvedEmailPath = isAbsolute(emailFile)
    ? emailFile
    : join(process.cwd(), emailFile);
  const emailText = readFileSync(resolvedEmailPath, 'utf8');

  const prompt = `You are an expert financial analyst creating a knowledge graph from a text. Your goal is to extract entities and relationships to build a graph. Your final output must be a single JSON object with \"entities\" and \"relationships\" keys.\n\n**Ontology Entities:**\n${entityLines}\n\n**Ontology Relationships:**\n${relationshipLines}\n\n**Text to Analyze:**\n---\n${emailText}\n---`;

  return prompt;
}

// --------------- CLI runner ---------------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const raw = argv.find((f) => f.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : undefined;
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`print-prompt.ts
      --ontology=<name>    Ontology plugin name (e.g., procurement)
      --email=<path>       Path to .eml file to analyse`);
    process.exit(0);
  }

  const ontologyName = getFlag('ontology');
  const emailPath = getFlag('email');

  try {
    const prompt = buildPrompt(ontologyName as string, emailPath as string);
    console.log(prompt);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
} 