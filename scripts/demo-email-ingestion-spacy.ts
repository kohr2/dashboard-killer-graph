// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import { SpacyEntityExtractionService, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';

// Simplified interface to match the service output
interface SpacyEmailProcessingResult {
  email: {
    subject: string;
    from: string;
    to: string[];
    content: string;
    date: Date;
  };
  entitiesExtracted: number;
  entities: SpacyExtractedEntity[];
  processingTime: number;
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - spaCy Microservice Version');
  console.log('=' .repeat(100));
  console.log('Processing .eml files from test-emails/ folder');

  // Initialize services
  const nlpService = new SpacyEntityExtractionService();

  console.log('\n🧠 Testing spaCy NLP microservice...');
  try {
    const testResult = await nlpService.extractEntities("Test message");
    console.log(`   ✅ spaCy service working correctly.`);
  } catch (e: any) {
    console.log(`   ❌ spaCy service error:`, e.message);
    console.log('   👉 Please ensure the Python service is running.');
    return;
  }

  // Read email files from the test-emails directory
  const testEmailsDir = join(process.cwd(), 'test-emails'); // Use process.cwd() for a reliable path
  const allEmailFiles = (await fs.readdir(testEmailsDir)).filter(f => f.endsWith('.eml'));
  
  // We'll process a specific, interesting subset for this demo
  const filesToProcess = [
      '01-helix-sourcing.eml',
      '03-blueowl-history-deal1.eml',
      '07-new-deal-for-audax-likelihood.eml',
      'deal-sourcing-tech-buyout.eml',
      'compliance-alert.eml'
  ].filter(f => allEmailFiles.includes(f));

  console.log(`\n📂 Found ${filesToProcess.length} email files to process...`);

  const results: SpacyEmailProcessingResult[] = [];
  let totalEntities = 0;
  let totalProcessingTime = 0;

  for (const file of filesToProcess) {
    console.log(`\n📧 Processing file: ${file}`);
    const startTime = Date.now();
    
    const filePath = join(testEmailsDir, file);
    const fileContent = await fs.readFile(filePath);
    const parsedEmail = await simpleParser(fileContent);

    const emailBody = typeof parsedEmail.text === 'string' ? parsedEmail.text : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
    if (!emailBody) {
        console.log('   ⚠️ Could not extract text body from email. Skipping.');
        continue;
    }

    // Extract entities using spaCy microservice
    const extractionResult = await nlpService.extractEntities(emailBody);

    console.log(`   🧠 spaCy service extracted ${extractionResult.entityCount} entities`);
    if (extractionResult.entityCount > 0) {
        console.log(`   🔍 Entity types: ${[...new Set(extractionResult.entities.map(e => e.type))].join(', ')}`);
    }

    const processingTime = Date.now() - startTime;

    const result: SpacyEmailProcessingResult = {
      email: {
        subject: parsedEmail.subject || 'No Subject',
        from: parsedEmail.from?.text || 'Unknown Sender',
        to: Array.isArray(parsedEmail.to) ? parsedEmail.to.map(t => t.text || '') : [parsedEmail.to?.text || ''],
        content: emailBody,
        date: parsedEmail.date || new Date()
      },
      entitiesExtracted: extractionResult.entityCount,
      entities: extractionResult.entities,
      processingTime
    };

    results.push(result);
    totalEntities += extractionResult.entityCount;
    totalProcessingTime += processingTime;
  }
  
  // Display overall results
  console.log('\n📊 SPACY PROCESSING SUMMARY');
  console.log('=' .repeat(80));
  console.log(`📧 Total emails processed: ${results.length}`);
  console.log(`🧠 Total entities extracted: ${totalEntities}`);
  console.log(`⏱️  Average processing time: ${(totalProcessingTime / (results.length || 1)).toFixed(0)}ms per email`);

  // Detailed email analysis
  console.log('\n\n📧 DETAILED SPACY EMAIL ANALYSIS');
  console.log('=' .repeat(80));

  for (const [index, result] of results.entries()) {
    displaySpacyEmailAnalysis(result, index + 1);
  }
  
  console.log('\n🎉 Email Ingestion Pipeline Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated:');
  console.log('   • Microservice-based NLP processing from .eml files');
  console.log('   • Advanced entity extraction and categorization');
}

function displaySpacyEmailAnalysis(result: SpacyEmailProcessingResult, emailNumber: number) {
  console.log(`\n--- ANALYSIS FOR EMAIL ${emailNumber} ---`);
  console.log(`Subject: ${result.email.subject}`);
  console.log(`From: ${result.email.from}`);
  console.log(`Date: ${result.email.date.toUTCString()}`);
  console.log(`Processing time: ${result.processingTime}ms`);
  console.log(`\n🧠 Entities Extracted (${result.entitiesExtracted}):`);
  
  if (result.entities.length > 0) {
    const entityGroups: { [key: string]: SpacyExtractedEntity[] } = {};
    result.entities.forEach(e => {
      if (!entityGroups[e.type]) {
        entityGroups[e.type] = [];
      }
      entityGroups[e.type].push(e);
    });

    for (const type in entityGroups) {
      console.log(`  • ${type}:`);
      entityGroups[type].forEach(e => {
        console.log(`    - "${e.value}" (Confidence: ${(e.confidence * 100).toFixed(1)}%)`);
      });
    }
  } else {
    console.log('  No entities found.');
  }
}

demonstrateSpacyEmailIngestionPipeline().catch(e => {
  console.error('An unexpected error occurred:', e);
}); 