#!/usr/bin/env ts-node

import 'reflect-metadata';
import { join } from 'path';
import { promises as fs } from 'fs';
import { simpleParser, ParsedMail } from 'mailparser';
import { container } from 'tsyringe';
import axios from 'axios';

import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { registerAllOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@common/utils/logger';

interface EntityAnalysis {
  emailId: string;
  emailSubject: string;
  extractedEntities: Array<{
    value: string;
    type: string;
  }>;
  potentialEntities: Array<{
    value: string;
    type: string;
    reason: string;
  }>;
  missingEntities: Array<{
    value: string;
    type: string;
    reason: string;
  }>;
}

export async function analyzeEntityRecognition(): Promise<void> {
  // Initialize services
  registerAllOntologies();
  const ontologyService = container.resolve(OntologyService);
  const contentProcessingService = container.resolve(ContentProcessingService);
  
  logger.info('🔍 Starting entity recognition analysis...');
  
  // Get all available entity types
  const allEntityTypes = ontologyService.getAllEntityTypes();
  logger.info(`📋 Available entity types: ${allEntityTypes.length}`);
  
  // Read 10 emails
  const emailsDir = join(process.cwd(), 'test', 'fixtures', 'procurement', 'emails');
  const files = (await fs.readdir(emailsDir))
    .filter(f => f.endsWith('.eml'))
    .sort()
    .slice(0, 10);
  
  logger.info(`📧 Analyzing ${files.length} emails...`);
  
  const analysisResults: EntityAnalysis[] = [];
  
  for (const file of files) {
    logger.info(`\n--- Analyzing: ${file} ---`);
    
    // Parse email
    const raw = await fs.readFile(join(emailsDir, file), 'utf-8');
    const parsed = await simpleParser(raw);
    const body = typeof parsed.text === 'string' ? parsed.text : (parsed.html || '').replace(/<[^>]*>/g, '');
    
    // Extract entities using the system
    let extractedEntities: Array<{ value: string; type: string }> = [];
    try {
      const results = await contentProcessingService.processContentBatch([body], 'procurement');
      if (results.length > 0 && results[0].entities) {
        extractedEntities = results[0].entities.map(e => ({
          value: e.name,
          type: e.type
        }));
      }
    } catch (error) {
      logger.error(`❌ Failed to extract entities for ${file}:`, error);
    }
    
    // Manual analysis for potential entities
    const potentialEntities = analyzeTextForPotentialEntities(body, allEntityTypes);
    
    // Find missing entities
    const missingEntities = potentialEntities.filter(potential => 
      !extractedEntities.some(extracted => 
        extracted.value.toLowerCase() === potential.value.toLowerCase() &&
        extracted.type === potential.type
      )
    );
    
    const analysis: EntityAnalysis = {
      emailId: file,
      emailSubject: parsed.subject || 'No Subject',
      extractedEntities,
      potentialEntities,
      missingEntities
    };
    
    analysisResults.push(analysis);
    
    // Log results for this email
    logger.info(`📊 Email: ${parsed.subject}`);
    logger.info(`   ✅ Extracted: ${extractedEntities.length} entities`);
    logger.info(`   🔍 Potential: ${potentialEntities.length} entities`);
    logger.info(`   ❌ Missing: ${missingEntities.length} entities`);
    
    if (extractedEntities.length > 0) {
      logger.info(`   📝 Extracted entities:`);
      extractedEntities.forEach(e => logger.info(`      - ${e.value} (${e.type})`));
    }
    
    if (missingEntities.length > 0) {
      logger.info(`   ⚠️  Missing entities:`);
      missingEntities.forEach(e => logger.info(`      - ${e.value} (${e.type}) - ${e.reason}`));
    }
  }
  
  // Summary statistics
  const totalExtracted = analysisResults.reduce((sum, r) => sum + r.extractedEntities.length, 0);
  const totalPotential = analysisResults.reduce((sum, r) => sum + r.potentialEntities.length, 0);
  const totalMissing = analysisResults.reduce((sum, r) => sum + r.missingEntities.length, 0);
  
  logger.info(`\n📈 SUMMARY STATISTICS:`);
  logger.info(`   Total emails analyzed: ${analysisResults.length}`);
  logger.info(`   Total entities extracted: ${totalExtracted}`);
  logger.info(`   Total potential entities: ${totalPotential}`);
  logger.info(`   Total missing entities: ${totalMissing}`);
  logger.info(`   Extraction rate: ${((totalExtracted / totalPotential) * 100).toFixed(1)}%`);
  
  // Save detailed results to file
  const outputPath = join(process.cwd(), 'entity-recognition-analysis.json');
  await fs.writeFile(outputPath, JSON.stringify(analysisResults, null, 2));
  logger.info(`\n💾 Detailed analysis saved to: ${outputPath}`);
}

function analyzeTextForPotentialEntities(text: string, entityTypes: string[]): Array<{ value: string; type: string; reason: string }> {
  const potentialEntities: Array<{ value: string; type: string; reason: string }> = [];
  
  // Common procurement patterns
  const patterns = [
    // Company names (common procurement companies)
    { pattern: /\b(ABC Corp|BlueOcean Logistics|Vertex Construction|Global Supplies Ltd|Helix Manufacturing|TechSolutions Inc|DataFlow Systems|Microsoft Corp)\b/gi, type: 'Business', reason: 'Company name mentioned' },
    
    // Monetary values
    { pattern: /\$[\d,]+(?:\.\d{2})?/g, type: 'MonetaryValue', reason: 'Dollar amount' },
    { pattern: /[\d,]+(?:\.\d{2})?\s*(CAD|GBP|EUR|USD)/g, type: 'MonetaryValue', reason: 'Currency amount' },
    
    // Procurement references
    { pattern: /PROCUREMENT-\d+/g, type: 'Contract', reason: 'Procurement reference number' },
    { pattern: /\b(RFQ|Request for Quote|Tender|Contract|Purchase Order)\b/gi, type: 'ProcurementDocument', reason: 'Procurement document type' },
    
    // Person names (common in procurement)
    { pattern: /\b(Lisa Williams|Michael Chen|John Smith|Robert Williams|Maria Garcia|Lisa Anderson)\b/gi, type: 'AgentInRole', reason: 'Person name mentioned' },
    
    // Procurement roles
    { pattern: /\b(Buyer|Contractor|Supplier|Tenderer|Awarder|Winner)\b/gi, type: 'Buyer', reason: 'Procurement role' },
    
    // Procurement objects
    { pattern: /\b(transport services|maintenance services|raw materials|software development)\b/gi, type: 'ProcurementObject', reason: 'Procurement object' },
    
    // Procurement terms
    { pattern: /\b(Award Decision|Award Criteria|AccessTerm|Conditions of access)\b/gi, type: 'AwardDecision', reason: 'Procurement term' },
    
    // Business entities
    { pattern: /\b(Procurement Department|Procurement Director)\b/gi, type: 'ProcurementServiceProvider', reason: 'Procurement service provider' }
  ];
  
  for (const { pattern, type, reason } of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        potentialEntities.push({
          value: match,
          type,
          reason
        });
      }
    }
  }
  
  // Remove duplicates
  const uniqueEntities = potentialEntities.filter((entity, index, self) => 
    index === self.findIndex(e => 
      e.value.toLowerCase() === entity.value.toLowerCase() && 
      e.type === entity.type
    )
  );
  
  return uniqueEntities;
}

// Execute if run directly
if (require.main === module) {
  analyzeEntityRecognition().catch(err => {
    console.error(err);
    process.exit(1);
  });
} 