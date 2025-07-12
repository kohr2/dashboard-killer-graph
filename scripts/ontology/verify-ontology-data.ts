#!/usr/bin/env ts-node

import "reflect-metadata";
import { OntologyVerificationService } from '../../src/platform/processing/ontology-verification.service';

/**
 * Generic Ontology Data Verification CLI
 * 
 * Usage:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/verify-ontology-data.ts \
 *   --ontology-name isco
 * 
 * Or for multiple ontologies:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/verify-ontology-data.ts \
 *   --ontology-names isco,fibo,procurement
 * 
 * Or for all ontologies summary:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/verify-ontology-data.ts \
 *   --summary
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const ontologyName = getArgValue(args, '--ontology-name');
  const ontologyNames = getArgValue(args, '--ontology-names');
  const summary = args.includes('--summary');

  // Create verification service
  const verificationService = new OntologyVerificationService();

  try {
    if (summary) {
      // Get summary of all ontologies
      await verificationService.getOntologySummary();
    } else if (ontologyNames) {
      // Verify multiple ontologies
      const names = ontologyNames.split(',').map(name => name.trim());
      await verificationService.verifyMultipleOntologies(names);
    } else if (ontologyName) {
      // Verify single ontology
      await verificationService.verifyOntologyData(ontologyName);
    } else {
      console.error('❌ Please specify one of: --ontology-name, --ontology-names, or --summary');
      console.error('');
      console.error('Examples:');
      console.error('  --ontology-name isco');
      console.error('  --ontology-names isco,fibo,procurement');
      console.error('  --summary');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Ontology verification failed:', error);
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