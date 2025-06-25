// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import { SpacyEntityExtractionService, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';
import axios from 'axios';
import { writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

// Add a unique ID to the entity interface
interface SpacyExtractedEntityWithId extends SpacyExtractedEntity {
  id: string;
}

// New structure for the final report
interface HybridReport {
  nodes: SpacyExtractedEntityWithId[];
  relationships: any[];
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - Full Flow to JSON');
  console.log('='.repeat(100));

  const nlpServiceUrl = 'http://localhost:8000';
  const reportPath = join(process.cwd(), 'hybrid-extraction-report.json');
  const allExtractedEntities: SpacyExtractedEntity[] = [];
  const allRelationships: any[] = [];
  
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
        console.log("   [4] Sending request to /extract-graph...");
        const response = await axios.post(`${nlpServiceUrl}/extract-graph`, { text: emailBody }, { timeout: 60000 }); // 60 second timeout
        console.log("   [5] Received response from service.");
        
        const { entities, relationships } = response.data;

        console.log(`\n✨ Found ${entities.length} entities and ${relationships.length} relationships:`);
        displayEntities(entities);
        if (relationships.length > 0) {
            console.log('  • Relationships:');
            relationships.forEach((r: any) => {
                console.log(`    - (${r.source}) -> [${r.type}] -> (${r.target})`);
            });
        }
        
        // Add entities to the master list
        entities.forEach((entity: SpacyExtractedEntity) => {
            allExtractedEntities.push({
                ...entity,
                source: emailFile // Add source email to the entity
            });
        });
        
        // Add relationships to the master list
        allRelationships.push(...relationships);

    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.error(`   ❌ Request timed out after 60 seconds.`);
      } else {
        console.error(`   ❌ Error calling graph extraction service:`, error.response?.data?.detail || error.message);
      }
    }
  }

  // 1. Create a map to find entities by their text value
  const entityValueMap = new Map<string, SpacyExtractedEntityWithId>();
  
  // 2. Deduplicate entities and assign unique IDs
  allExtractedEntities.forEach(entity => {
      const key = `${entity.value}|${entity.type}`;
      if (!entityValueMap.has(key)) {
        entityValueMap.set(key, { ...entity, id: uuidv4() });
      }
  });
  const finalNodes = Array.from(entityValueMap.values());

  // 3. Remap relationships to use IDs instead of names
  const finalRelationships = allRelationships.map(rel => {
    const sourceNode = finalNodes.find(n => n.value === rel.source);
    const targetNode = finalNodes.find(n => n.value === rel.target);

    // If we can't find the corresponding node, we can't create the relationship
    if (!sourceNode || !targetNode) {
        return null;
    }

    return {
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      type: rel.type,
      properties: rel.properties || {}
    };
  }).filter(r => r !== null); // Filter out null relationships

  const finalReport: HybridReport = {
    nodes: finalNodes,
    relationships: finalRelationships,
  };

  console.log('\n' + '='.repeat(100));
  console.log('✅ All emails processed. Generating final report...');
  writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  console.log(`   📄 Report saved to: ${reportPath}`);
  console.log(`   📊 Total unique entities found: ${finalNodes.length}`);
  console.log(`   🔗 Total relationships found: ${finalRelationships.length}`);
  console.log('='.repeat(100));

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