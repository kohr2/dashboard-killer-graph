/**
 * Demo script to test email attachment processing
 * Tests the new attachment processing capabilities with real email files
 */

import 'reflect-metadata';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { EmailProcessor } from '../../src/ingestion/sources/processors/email-processor';
import { AttachmentProcessingService } from '../../src/platform/processing/attachment-processing.service';
import { EmailParsingService } from '../../src/platform/processing/email-parsing.service';
import { logger } from '../../src/shared/utils/logger';

async function testAttachmentProcessing() {
  console.log('🔧 Testing Email Attachment Processing');
  console.log('====================================\n');

  const emailParsingService = new EmailParsingService();
  const attachmentProcessingService = new AttachmentProcessingService();
  const emailProcessor = new EmailProcessor(emailParsingService, attachmentProcessingService);
  const testEmailsDir = join(__dirname, '../../test/fixtures/emails');
  
  // Get all .eml files
  const emlFiles = readdirSync(testEmailsDir)
    .filter(file => file.endsWith('.eml'))
    .slice(0, 3); // Test with first 3 files only

  console.log(`📂 Found ${emlFiles.length} test email files\n`);

  for (const [index, fileName] of emlFiles.entries()) {
    console.log(`\n📧 [${index + 1}/${emlFiles.length}] Processing: ${fileName}`);
    console.log('─'.repeat(50));
    
    const filePath = join(testEmailsDir, fileName);
    
    try {
      // Test with attachment processing
      const result = await emailProcessor.processEmlFileWithAttachments(filePath);
      
      console.log(`✅ Processing successful: ${result.success}`);
      
      if (result.email) {
        console.log(`📨 Email Details:`);
        console.log(`   From: ${result.email.from}`);
        console.log(`   To: ${result.email.to.join(', ')}`);
        console.log(`   Subject: ${result.email.subject}`);
        console.log(`   Body length: ${result.email.body.length} characters`);
        console.log(`   Attachments: ${result.email.attachments.length}`);
      }

      if (result.attachmentProcessing) {
        console.log(`📎 Attachment Processing:`);
        console.log(`   Total processed: ${result.attachmentProcessing.totalProcessed}`);
        console.log(`   Supported formats: ${result.attachmentProcessing.supportedFormats}`);
        console.log(`   Unsupported formats: ${result.attachmentProcessing.unsupportedFormats}`);
        console.log(`   Processing time: ${result.attachmentProcessing.totalProcessingTime}ms`);
        
        if (result.attachmentProcessing.processedAttachments.length > 0) {
          console.log(`   Attachment details:`);
          result.attachmentProcessing.processedAttachments.forEach((att, i) => {
            console.log(`     ${i + 1}. ${att.filename} (${att.contentType})`);
            console.log(`        Supported: ${att.supportedFormat}`);
            if (att.extractedText) {
              console.log(`        Extracted text: ${att.extractedText.substring(0, 100)}...`);
            }
            if (att.entities && att.entities.length > 0) {
              console.log(`        Entities found: ${att.entities.length}`);
            }
          });
        }
      }

      console.log(`🔍 Entities extracted: ${result.entities.length}`);
      if (result.entities.length > 0) {
        result.entities.slice(0, 3).forEach((entity, i) => {
          // Handle both platform and ingestion entity types
          const entityName = 'name' in entity ? entity.name : entity.text;
          console.log(`   ${i + 1}. "${entityName}" (${entity.type}) - confidence: ${entity.confidence}`);
        });
        if (result.entities.length > 3) {
          console.log(`   ... and ${result.entities.length - 3} more`);
        }
      }

      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error);
    }
  }

  console.log('\n✅ Attachment processing test completed!');
}

// Test Excel and PowerPoint support
async function testOfficeFileSupport() {
  console.log('\n📊 Testing Excel and PowerPoint Support');
  console.log('======================================\n');

  const attachmentProcessor = new AttachmentProcessingService();

  // Create mock Excel data
  const mockExcelData = Buffer.from('Mock Excel spreadsheet with financial data');
  const mockPowerPointData = Buffer.from('Mock PowerPoint presentation with investment slides');

  const testAttachments = [
    {
      filename: 'financial-data.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: mockExcelData.length,
      content: mockExcelData,
    },
    {
      filename: 'investment-presentation.pptx',
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: mockPowerPointData.length,
      content: mockPowerPointData,
    },
    {
      filename: 'legacy-data.xls',
      contentType: 'application/vnd.ms-excel',
      size: 1000,
      content: Buffer.from('Mock legacy Excel file'),
    },
    {
      filename: 'legacy-presentation.ppt',
      contentType: 'application/vnd.ms-powerpoint',
      size: 2000,
      content: Buffer.from('Mock legacy PowerPoint file'),
    },
  ];

  console.log('Processing office file attachments...\n');

  try {
    const result = await attachmentProcessor.processAttachments(testAttachments);
    
    console.log(`✅ Processing completed successfully`);
    console.log(`📈 Results Summary:`);
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Supported formats: ${result.supportedFormats}`);
    console.log(`   Unsupported formats: ${result.unsupportedFormats}`);
    console.log(`   Processing time: ${result.totalProcessingTime}ms`);
    console.log(`   Entities extracted: ${result.extractedEntities.length}`);
    
    console.log('\n📋 Individual File Results:');
    result.processedAttachments.forEach((attachment, index) => {
      console.log(`\n${index + 1}. ${attachment.filename}`);
      console.log(`   Content Type: ${attachment.contentType}`);
      console.log(`   Supported: ${attachment.supportedFormat ? '✅' : '❌'}`);
      console.log(`   Processing Method: ${attachment.processingMethod || 'N/A'}`);
      console.log(`   Processing Duration: ${attachment.processingDuration}ms`);
      
      if (attachment.extractedText) {
        const preview = attachment.extractedText.length > 150 
          ? attachment.extractedText.substring(0, 150) + '...' 
          : attachment.extractedText;
        console.log(`   Extracted Text: "${preview}"`);
      }
      
      if (attachment.entities && attachment.entities.length > 0) {
        console.log(`   Entities Found: ${attachment.entities.length}`);
        attachment.entities.slice(0, 2).forEach(entity => {
          console.log(`     - "${entity.name}" (${entity.type})`);
        });
      }
      
      if (attachment.error) {
        console.log(`   Error: ${attachment.error}`);
      }
    });

    if (result.errors.length > 0) {
      console.log('\n⚠️  Processing Errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error.filename}: ${error.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing office file support:', error);
  }
}

// Test with different types of content
async function testSpecificCases() {
  console.log('\n🧪 Testing Specific Attachment Cases');
  console.log('===================================\n');

  const emailParsingService = new EmailParsingService();
  const attachmentProcessingService = new AttachmentProcessingService();
  const emailProcessor = new EmailProcessor(emailParsingService, attachmentProcessingService);

  // Test case 1: Email with mock PDF attachment
  console.log('1. Testing email with mock PDF attachment');
  const mockEmlWithPdf = `Message-ID: <test-pdf@example.com>
From: "Sender" <sender@example.com>
To: "Recipient" <recipient@example.com>
Subject: Document with PDF attachment
Date: Mon, 01 Jan 2024 12:00:00 +0000
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

Please find the attached financial report.

--boundary123
Content-Type: application/pdf; name="financial-report.pdf"
Content-Disposition: attachment; filename="financial-report.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJcOkw7zDtsOmCjIgMCJvYmoKPDwKL0xlbmd0aCAzIDA
--boundary123--`;

  // Write mock email to temporary file
  require('fs').writeFileSync('/tmp/test-email-with-pdf.eml', mockEmlWithPdf);
  
  try {
    const result = await emailProcessor.processEmlFileWithAttachments('/tmp/test-email-with-pdf.eml');
    console.log(`   Success: ${result.success}`);
    console.log(`   Attachments processed: ${result.attachmentProcessing?.totalProcessed || 0}`);
    
    // Clean up
    require('fs').unlinkSync('/tmp/test-email-with-pdf.eml');
  } catch (error) {
    console.error('   Error:', error);
  }
}

// Run the tests
async function main() {
  try {
    await testAttachmentProcessing();
    await testOfficeFileSupport();
    await testSpecificCases();
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 