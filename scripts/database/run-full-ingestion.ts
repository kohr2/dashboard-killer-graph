// Full Deal Flow Ingestion Script
// Reads all .eml files, processes them with the hybrid service, and creates a consolidated report.

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { HybridExtractionService } from './demo-hybrid-entity-recognition'; // Adjust path if needed

async function runFullIngestion() {
  console.log('🚀 Starting Full Deal Flow Ingestion 🚀');
  console.log('====================================================\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: OpenAI API key not found in .env file.");
    return;
  }

  const hybridService = new HybridExtractionService(apiKey);
  const emailsDirectory = join(__dirname, '../test-emails');
  const outputReportPath = join(__dirname, '../full-deal-flow-report.json');
  
  const allAnalyses: unknown[] = [];
  const emailFiles = readdirSync(emailsDirectory).filter(f => f.endsWith('.eml'));

  console.log(`Found ${emailFiles.length} email files to process...`);

  for (const fileName of emailFiles) {
    console.log(`\n--- Processing: ${fileName} ---`);
    try {
      const emailPath = join(emailsDirectory, fileName);
      const emailText = readFileSync(emailPath, 'utf8');
      
      const { llmResults } = await hybridService.processText(emailText);
      
      allAnalyses.push({
        sourceFile: fileName,
        analysis: llmResults
      });
      console.log(`   ✅ Successfully analyzed and added to report.`);

    } catch (error) {
      console.error(`   ❌ Failed to process ${fileName}:`, error);
    }
  }

  console.log(`\n\n--- ✅ Ingestion Complete ---`);
  writeFileSync(outputReportPath, JSON.stringify(allAnalyses, null, 2));
  console.log(`📄 Full deal flow report saved to: ${outputReportPath}`);
  console.log(`   Processed ${allAnalyses.length} out of ${emailFiles.length} emails.`);
}

if (require.main === module) {
  runFullIngestion().catch(console.error);
} 