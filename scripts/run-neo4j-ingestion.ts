// scripts/run-neo4j-ingestion.ts

import 'reflect-metadata';
import { readdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { EmailProcessingService } from '../src/extensions/crm/application/services/email-processing.service';
import { InMemoryContactRepository } from '../src/extensions/crm/infrastructure/repositories/in-memory-contact-repository';
import { Neo4jCommunicationRepository } from '../src/extensions/crm/infrastructure/repositories/neo4j-communication-repository';
import { SpacyEntityExtractionService } from '../src/extensions/crm/application/services/spacy-entity-extraction.service';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';

async function runNeo4jIngestion() {
  console.log('🚀 Starting Neo4j Ingestion Pipeline 🚀');
  console.log('============================================\n');

  const connection = Neo4jConnection.getInstance();
  
  try {
    // Establish connection to Neo4j
    await connection.connect();
    console.log('✅ Neo4j connection established.');

    // Instantiate all dependencies
    const contactRepository = new InMemoryContactRepository();
    const communicationRepository = new Neo4jCommunicationRepository();
    const entityExtractionService = new SpacyEntityExtractionService();

    // Inject dependencies into the service
    const emailProcessingService = new EmailProcessingService(
      contactRepository,
      communicationRepository,
      entityExtractionService
    );

    console.log('✅ Services and repositories initialized.');

    const emailsDir = join(__dirname, '..', 'test-emails');
    const emailFiles = readdirSync(emailsDir).filter(f => f.endsWith('.eml'));

    console.log(`📂 Found ${emailFiles.length} email files to process...`);

    for (const fileName of emailFiles) {
      console.log(`\n--- Processing: ${fileName} ---`);
      try {
        const emailPath = join(emailsDir, fileName);
        await emailProcessingService.processEmlFile(emailPath);
        console.log(`   ✅ Successfully processed and ingested ${fileName}`);
      } catch (error) {
        console.error(`   ❌ Failed to process ${fileName}:`, error);
      }
    }

    console.log('\n\n--- ✅ Ingestion Complete ---');
    console.log(`   Processed ${emailFiles.length} emails.`);

  } finally {
    await connection.close();
    console.log('\n🔌 Neo4j connection closed.');
  }
}

runNeo4jIngestion().catch(console.error); 