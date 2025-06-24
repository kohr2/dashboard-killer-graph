import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SpacyEntityExtractionService } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { HybridDealExtractionService } from '../src/extensions/financial/application/services/hybrid-deal-extraction.service';

const emailFilePath = join(__dirname, '../test-emails/deal-sourcing-tech-buyout.eml');
const outputFilePath = join(__dirname, '../hybrid-extraction-report-generated.json');

async function runHybridExtractionDemo() {
  console.log('🚀 Starting Hybrid Deal Extraction Demo...');

  // 1. Initialize services
  const spacyService = new SpacyEntityExtractionService();
  const hybridService = new HybridDealExtractionService();

  // 2. Read email content
  const emailContent = readFileSync(emailFilePath, 'utf-8');
  console.log(`📄 Read email file: ${emailFilePath}`);

  // 3. Extract entities using spaCy
  console.log('🧠 Extracting entities with spaCy...');
  const spacyResult = await spacyService.extractEntities(emailContent);
  console.log(`✨ Extracted ${spacyResult.entityCount} entities.`);

  // 4. Extract structured deal report
  console.log('🏗️ Building structured deal report...');
  const hybridReport = await hybridService.extract(emailContent, spacyResult.entities);
  console.log('✅ Successfully created hybrid deal report.');

  // 5. Save the report to a file
  writeFileSync(outputFilePath, JSON.stringify(hybridReport, null, 2));
  console.log(`💾 Report saved to: ${outputFilePath}`);

  console.log('\n--- Generated Hybrid Report ---');
  console.log(JSON.stringify(hybridReport, null, 2));
  console.log('-----------------------------\n');
  
  console.log('🏁 Demo finished.');
}

runHybridExtractionDemo().catch(error => {
  console.error('An error occurred during the demo:', error);
}); 