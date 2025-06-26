// scripts/run-neo4j-ingestion.ts

import 'reflect-metadata';
import { readdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { EmailProcessingService } from '../src/extensions/crm/application/services/email-processing.service';
import { container } from 'tsyringe';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import '../src/register-extensions';

async function runNeo4jIngestion() {
  console.log('🚀 Starting Neo4j Ingestion Pipeline 🚀');
  console.log('============================================\n');

  const connection = Neo4jConnection.getInstance();
  
  try {
    // Establish connection to Neo4j
    await connection.connect();
    console.log('✅ Neo4j connection established.');

    // Resolve the main service from the container
    const emailProcessingService = container.resolve(EmailProcessingService);

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