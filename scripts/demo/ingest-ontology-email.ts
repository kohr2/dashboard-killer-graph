#!/usr/bin/env ts-node
import 'reflect-metadata';
import { OntologyEmailIngestionService } from '@platform/processing/ontology-email-ingestion.service';

async function main() {
  const ontologyName = process.argv[2];
  if (!ontologyName) {
    console.error('Usage: npx ts-node scripts/demo/ingest-ontology-email.ts <ontologyName>');
    process.exit(1);
  }
  const service = new OntologyEmailIngestionService();
  try {
    console.log(`Ingesting fixture email for ontology: ${ontologyName}`);
    await service.ingestOntologyEmail(ontologyName);
    console.log('✅ Ingestion complete. Data is now in the database.');
  } catch (err) {
    console.error('❌ Ingestion failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 