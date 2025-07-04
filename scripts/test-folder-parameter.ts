#!/usr/bin/env ts-node
/**
 * Test script to verify folder parameter logic
 */

import { join } from 'path';
import { promises as fs } from 'fs';

async function testFolderParameter() {
  console.log('🧪 Testing Folder Parameter Logic');
  console.log('==================================\n');

  // Parse command line arguments (same logic as email ingestion)
  const argvFlags = process.argv.slice(2);
  const FOLDER_ARG = argvFlags.find((arg) => arg.startsWith('--folder='));
  const EMAIL_FOLDER = FOLDER_ARG ? FOLDER_ARG.split('=')[1] : 'emails';

  console.log(`📂 Using folder: ${EMAIL_FOLDER}`);

  const testEmailsDir = join(process.cwd(), 'test', 'fixtures', EMAIL_FOLDER);
  
  try {
    const allFiles = await fs.readdir(testEmailsDir);
    const emailFiles = allFiles.filter(f => f.endsWith('.eml')).sort();
    
    console.log(`✅ Found ${emailFiles.length} email files in '${testEmailsDir}'`);
    
    if (emailFiles.length > 0) {
      console.log('\n📧 Sample files:');
      emailFiles.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
      if (emailFiles.length > 5) {
        console.log(`   ... and ${emailFiles.length - 5} more`);
      }
    }
    
    console.log('\n✅ Folder parameter test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Error accessing folder '${testEmailsDir}':`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  testFolderParameter().catch(e => {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  });
} 