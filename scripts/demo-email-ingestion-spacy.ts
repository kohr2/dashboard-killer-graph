// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import { SpacyEntityExtractionService, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';
import axios from 'axios';

// Simplified interface to match the service output
interface SpacyEmailProcessingResult {
  email: {
    subject: string;
    from: string;
    to: string[];
    content: string;
    date: Date;
  };
  raw_entities: SpacyExtractedEntity[];
  refined_entities: SpacyExtractedEntity[];
  processingTime: number;
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - LLM Refined Version');
  console.log('=' .repeat(100));

  const nlpServiceUrl = 'http://localhost:8000';
  
  console.log('\n🧠 Testing NLP microservice connection...');
  try {
    await axios.get(`${nlpServiceUrl}/health`);
    console.log(`   ✅ NLP service is running.`);
  } catch (e: any) {
    console.log(`   ❌ NLP service is not responding at ${nlpServiceUrl}`);
    return;
  }

  const testEmailsDir = join(process.cwd(), 'test-emails');
  const allFiles = await fs.readdir(testEmailsDir);
  const emailFiles = allFiles.filter(f => f.endsWith('.eml')).sort();
  
  console.log(`\n📂 Found ${emailFiles.length} email files to process in '${testEmailsDir}'`);

  for (const emailFile of emailFiles) {
    console.log('\n' + '='.repeat(100));
    console.log(`Processing: ${emailFile}`);
    console.log('='.repeat(100));

    const filePath = join(testEmailsDir, emailFile);
    let emailBody;

    try {
      console.log("   [1] Reading file...");
      const fileContent = await fs.readFile(filePath);
      console.log("   [2] Parsing email...");
      const parsedEmail = await simpleParser(fileContent);
      emailBody = typeof parsedEmail.text === 'string' ? parsedEmail.text : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
      console.log("   [3] Email parsed successfully.");
    } catch(e: any) {
        console.error("   ❌ Error reading or parsing email file:", e.message);
        continue; // Skip to the next email
    }

    try {
        console.log("   [4] Sending request to /refine-entities...");
        const response = await axios.post(`${nlpServiceUrl}/refine-entities`, { text: emailBody });
        console.log("   [5] Received response from service.");
        
        const { raw_entities, refined_entities } = response.data;

        console.log("\n\n--- FINAL RESULT ---");
        console.log(`\n🧠 Raw Entities Extracted (${raw_entities.length}):`);
        displayEntities(raw_entities);
        
        console.log(`\n✨ LLM Refined Entities (${refined_entities.length}):`);
        displayEntities(refined_entities);

    } catch (error: any) {
      console.error(`   ❌ Error calling refinement service:`, error.response?.data?.detail || error.message);
    }
  }

  console.log('\n\n🎉 Demo Complete!');
}

function displayEntities(entities: SpacyExtractedEntity[]) {
    if (entities.length === 0) {
        console.log('  No entities found.');
        return;
    }
    const entityGroups: { [key: string]: SpacyExtractedEntity[] } = {};
    entities.forEach(e => {
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
}

demonstrateSpacyEmailIngestionPipeline().catch(e => {
  console.error('An unexpected error occurred:', e);
}); 