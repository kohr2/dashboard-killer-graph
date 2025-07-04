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
import { getEnabledPlugins, getPluginSummary, pluginRegistry } from '../../config/ontology/plugins.config';

interface ParsedEmailWithSource extends ParsedMail {
  sourceFile: string;
}

/**
 * Separates entities into property and non-property groups based on ontology property types
 */
export function separatePropertyEntities(
  entities: any[],
  propertyEntityTypes: string[]
): { propertyEntities: any[]; nonPropertyEntities: any[] } {
  const propertyEntities: any[] = [];
  const nonPropertyEntities: any[] = [];

  for (const entity of entities) {
    if (propertyEntityTypes.includes(entity.type)) {
      propertyEntities.push(entity);
    } else {
      nonPropertyEntities.push(entity);
    }
  }

  return { propertyEntities, nonPropertyEntities };
}

async function demonstrateSpacyEmailIngestionPipeline() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📧 Email Ingestion Pipeline - Help
==================================

Usage: npx ts-node scripts/pipeline/email-ingestion.ts [options]

Options:
  --folder=<path>     Specify email folder to process (default: emails)
  --database=<name>   Specify database to use (default: neo4j)
  --ontology=<name>   Specify ontology to use (default: all enabled)
  --reset-db          Reset database before ingestion
  --help, -h          Show this help message

Examples:
  # Process financial emails with default database and all ontologies
  npx ts-node scripts/pipeline/email-ingestion.ts --folder=financial/emails

  # Process procurement emails with specific database and ontology
  npx ts-node scripts/pipeline/email-ingestion.ts --folder=procurement/emails --database=procurement --ontology=procurement

  # Process emails with specific ontology only
  npx ts-node scripts/pipeline/email-ingestion.ts --folder=procurement/emails --ontology=crm

  # Process emails with database reset
  npx ts-node scripts/pipeline/email-ingestion.ts --folder=procurement/emails --database=procurement --ontology=procurement --reset-db

  # Process default emails folder
  npx ts-node scripts/pipeline/email-ingestion.ts

Available folders:
  - financial/emails    Financial domain emails
  - procurement/emails  Procurement domain emails
  - crm/emails         CRM domain emails
  - legal/emails       Legal domain emails
  - healthcare/emails  Healthcare domain emails
  - fibo/emails        FIBO financial emails
  - emails             Default emails (legacy)

Available databases:
  - neo4j              Default database
  - test               Test database
  - procurement        Procurement-specific database
  - financial          Financial-specific database
  - crm               CRM-specific database
  - [custom]           Any custom database name

Available ontologies:
  - core               Core ontology (always enabled)
  - crm                Customer Relationship Management
  - financial          Financial instruments and deals
  - procurement        Public procurement procedures
  - fibo               Financial Industry Business Ontology
  - all                All enabled ontologies (default)

Requirements:
  - OPENAI_API_KEY in .env file
  - Neo4j database running
  - Python NLP service running (optional)
  - Database must exist (use create-database.ts script to create)
`);
    process.exit(0);
  }

  console.log('📧 Refactored Email Ingestion Pipeline Demo');
  console.log('='.repeat(100));

  // Parse command line arguments
  const argvFlags = process.argv.slice(2);
  const FOLDER_ARG = argvFlags.find((arg) => arg.startsWith('--folder='));
  const DATABASE_ARG = argvFlags.find((arg) => arg.startsWith('--database='));
  const ONTOLOGY_ARG = argvFlags.find((arg) => arg.startsWith('--ontology='));
  const EMAIL_FOLDER = FOLDER_ARG ? FOLDER_ARG.split('=')[1] : 'emails';
  const DATABASE_NAME = DATABASE_ARG ? DATABASE_ARG.split('=')[1] : 'neo4j';
  const ONTOLOGY_NAME = ONTOLOGY_ARG ? ONTOLOGY_ARG.split('=')[1] : 'all';

  // Set database environment variable
  process.env.NEO4J_DATABASE = DATABASE_NAME;
  console.log(`🗄️ Using database: ${DATABASE_NAME}`);

  // Handle ontology selection
  console.log(`🏛️ Ontology selection: ${ONTOLOGY_NAME}`);
  
  if (ONTOLOGY_NAME !== 'all') {
    // Enable only the specified ontology
    const allPlugins = pluginRegistry.getAllPlugins();
    const availableOntologies = Array.from(allPlugins.keys());
    
    if (!availableOntologies.includes(ONTOLOGY_NAME)) {
      console.error(`❌ Ontology '${ONTOLOGY_NAME}' not found. Available ontologies: ${availableOntologies.join(', ')}`);
      process.exit(1);
    }
    
    // Disable all ontologies first
    for (const ontology of availableOntologies) {
      pluginRegistry.setPluginEnabled(ontology, false);
    }
    
    // Enable only the specified ontology (and core)
    pluginRegistry.setPluginEnabled('core', true);
    pluginRegistry.setPluginEnabled(ONTOLOGY_NAME, true);
    
    console.log(`✅ Enabled ontology: ${ONTOLOGY_NAME} (plus core)`);
  } else {
    // Use all enabled ontologies (default behavior)
    console.log('✅ Using all enabled ontologies');
  }

  // Check for reset flag
  if (process.argv.includes('--reset-db')) {
    console.log('🔄 --reset-db flag found. Resetting database before ingestion...');
    await resetDatabase();
    console.log('✅ Database reset complete.');
  }

  // Initialize ontologies with selected plugins
  registerAllOntologies();
  const ontologyService = container.resolve(OntologyService);
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const propertyEntityTypes = ontologyService.getPropertyEntityTypes();
  const validRelationshipTypes = ontologyService.getAllRelationshipTypes();

  // Show ontology summary
  const pluginSummary = getPluginSummary();
  console.log('🏛️ Active Ontologies:', pluginSummary.enabled.join(', '));
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
    console.warn('   ⚠️ Continuing without NLP ontology sync. Some NLP features may be disabled.');
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

    const testEmailsDir = join(process.cwd(), 'test', 'fixtures', EMAIL_FOLDER);
    const allFiles = await fs.readdir(testEmailsDir);
    const emailFiles = allFiles.filter(f => f.endsWith('.eml')).sort();
    const filesToProcess = emailFiles;

    console.log(`\n📂 Found ${emailFiles.length} email files, parsing all of them before batch processing in '${testEmailsDir}' (folder: ${EMAIL_FOLDER})`);

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
  demonstrateSpacyEmailIngestionPipeline().catch(e => {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  });
}

export { demonstrateSpacyEmailIngestionPipeline }; 