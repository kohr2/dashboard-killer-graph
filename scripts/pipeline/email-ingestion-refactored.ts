#!/usr/bin/env ts-node

import 'reflect-metadata';
import { join } from 'path';
import { promises as fs } from 'fs';
import { simpleParser, ParsedMail } from 'mailparser';
import { GenericIngestionPipeline, IngestionInput } from './generic-ingestion-pipeline';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { Neo4jIngestionService, ProcessingResult } from '@platform/processing/neo4j-ingestion.service';
import { container } from 'tsyringe';
import { registerAllOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { resetDatabase } from '../database/reset-neo4j';
import { OntologyDrivenReasoningService } from '@platform/reasoning/ontology-driven-reasoning.service';
import { logger } from '@shared/utils/logger';

interface ParsedEmailWithSource extends ParsedMail {
  sourceFile: string;
}

async function demonstrateRefactoredEmailIngestionPipeline() {
  console.log('📧 Refactored Email Ingestion Pipeline Demo');
  console.log('='.repeat(100));

  // Check for reset flag
  if (process.argv.includes('--reset-db')) {
    console.log('🔄 --reset-db flag found. Resetting database before ingestion...');
    await resetDatabase();
    console.log('✅ Database reset complete.');
  }

  // Initialize ontologies
  registerAllOntologies();
  const ontologyService = container.resolve(OntologyService);
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const propertyEntityTypes = ontologyService.getPropertyEntityTypes();
  const validRelationshipTypes = ontologyService.getAllRelationshipTypes();

  console.log('🏛️ Registered Ontology Types:', validEntityTypes.length);
  console.log('🏠 Registered Property Types:', propertyEntityTypes.length);
  console.log('🔗 Registered Relationship Types:', validRelationshipTypes.length);

  // Sync ontology with Python NLP Service
  try {
    console.log('   ⚡ Syncing ontology with NLP service...');
    const axios = require('axios');
    await axios.post('http://127.0.0.1:8000/ontologies', {
      entity_types: validEntityTypes,
      property_types: propertyEntityTypes,
      relationship_types: validRelationshipTypes
    });
    console.log('   ✅ Ontology synced successfully.');
  } catch (error: any) {
    console.error('   ❌ Failed to sync ontology with NLP service. The service might not be running or the endpoint is incorrect.', error.message);
    process.exit(1);
  }

  // Initialize services
  const contentProcessingService = container.resolve(ContentProcessingService);
  const neo4jIngestionService = container.resolve(Neo4jIngestionService);
  
  // Initialize Neo4j service
  await neo4jIngestionService.initialize();

  // Create generic pipeline with Neo4j ingestion service
  const pipeline = new GenericIngestionPipeline(
    contentProcessingService,
    neo4jIngestionService
  );

  try {
    console.log('📧 Email Ingestion Pipeline Demo - Using Generic Pipeline');
    console.log('='.repeat(100));

    const testEmailsDir = join(process.cwd(), 'test-emails');
    const allFiles = await fs.readdir(testEmailsDir);
    const emailFiles = allFiles.filter(f => f.endsWith('.eml')).sort();
    const filesToProcess = emailFiles;

    console.log(`\n📂 Found ${emailFiles.length} email files, parsing all of them before batch processing in '${testEmailsDir}'`);

    const emailInputs: IngestionInput[] = [];
    const parsedEmails: ParsedEmailWithSource[] = [];

    for (const emailFile of filesToProcess) {
      const filePath = join(testEmailsDir, emailFile);
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsedEmail = await simpleParser(fileContent);
        const emailBody = typeof parsedEmail.text === 'string'
          ? parsedEmail.text
          : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
        
        emailInputs.push({
          id: emailFile,
          content: emailBody,
          meta: {
            sourceFile: emailFile,
            parsedEmail: parsedEmail
          }
        });
        parsedEmails.push({ ...parsedEmail, sourceFile: emailFile } as ParsedEmailWithSource);
      } catch (e: any) {
        console.error(`   ❌ Error reading or parsing email file ${emailFile}:`, e.message);
      }
    }

    console.log(`\n[1] All ${emailInputs.length} emails parsed. Starting batch ingestion...`);
    
    // Use the generic pipeline with email-specific extraction
    await pipeline.run(emailInputs);
    
    console.log('[2] Batch processing complete.');

    console.log('\n✅ Email ingestion completed successfully!');

  } catch (error) {
    console.error('❌ Error during email ingestion:', error);
    throw error;
  } finally {
    // Execute reasoning algorithms after all data is ingested
    try {
      console.log('\n🔍 Executing reasoning algorithms...');
      const reasoningService = container.resolve(OntologyDrivenReasoningService);
      await reasoningService.executeAllReasoning();
      console.log('✅ Reasoning algorithms completed successfully');
    } catch (reasoningError) {
      console.error('❌ Error during reasoning execution:', reasoningError);
    }
    
    // Cleanup
    await neo4jIngestionService.close();
  }

  console.log('\n🎉 Refactored Email Ingestion Demo Complete!');
}

if (require.main === module) {
  demonstrateRefactoredEmailIngestionPipeline().catch(e => {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  });
}

export { demonstrateRefactoredEmailIngestionPipeline }; 