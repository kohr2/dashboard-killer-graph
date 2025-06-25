// Email Ingestion Pipeline Demo - spaCy Powered Version
// Advanced entity extraction using a dedicated microservice

import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { OCreamV2Ontology, DOLCECategory, createInformationElement, KnowledgeType } from '../src/crm-core/domain/ontology/o-cream-v2';
import { Contact } from '../src/crm-core/domain/entities/contact';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { SpacyEntityExtractionService, SpacyExtractedEntity, SpacyExtractionResult } from '../src/crm-core/application/services/spacy-entity-extraction.service';

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
  contactsProcessed: number;
  knowledgeElementsCreated: number;
  processingTime: number;
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - spaCy Microservice Version');
  console.log('=' .repeat(100));
  console.log('Advanced NLP: Microservice entity extraction → Contact creation → Knowledge graph');
  
  // Initialize services
  const contactRepository = new InMemoryContactRepository();
  const ontology = OCreamV2Ontology.getInstance();
  const nlpService = new SpacyEntityExtractionService(); // Uses default http://127.0.0.1:8000
  
  console.log('\n🔧 Initialized services:');
  console.log('   ✅ Contact Repository (In-Memory)');
  console.log('   ✅ O-CREAM-v2 Ontology');
  console.log('   ✅ spaCy NLP Microservice');
  
  // Test spaCy connection
  console.log('\n🧠 Testing spaCy NLP microservice...');
  try {
    const testResult = await nlpService.extractEntities("Test message with Apple Inc. and $1000");
    console.log(`   ✅ spaCy service working correctly - extracted ${testResult.entityCount} entities`);
  } catch (e: any) {
    console.log(`   ❌ spaCy service error:`, e.message);
    console.log('   👉 Please ensure the Python service is running. See python-services/README.md');
    return;
  }
  
  // Sample email data with more complex content for spaCy
  const sampleEmails = [
    {
      subject: 'Portfolio Review Meeting - Goldman Sachs Holdings',
      from: 'sarah.johnson@goldmansachs.com',
      to: ['robert.smith@email.com'],
      content: `Dear Mr. Robert Smith,

Your quarterly portfolio review is scheduled for Tuesday, January 23rd, 2024 at 2:00 PM EST. 

Current holdings as of January 15th, 2024:
- Goldman Sachs Group Inc. (NYSE: GS) - 1,000 shares valued at $350,000
- Apple Inc. (NASDAQ: AAPL) - 500 shares valued at $125,000  
- Microsoft Corporation (NASDAQ: MSFT) - 750 shares valued at $200,000
- Tesla Inc. (NASDAQ: TSLA) - 100 shares valued at $75,000

Total portfolio value: $2,500,000 USD
Year-to-date return: +12.5%
Risk assessment: Moderate (Beta: 1.2)

Please contact me at sarah.johnson@goldmansachs.com or call (212) 555-0123 if you have any questions.

Best regards,
Sarah Johnson, CFA
Senior Portfolio Manager
Goldman Sachs Private Wealth Management
200 West Street, New York, NY 10282`,
      date: new Date('2024-01-15T14:30:00Z')
    },
    {
      subject: 'URGENT: Compliance Alert - Large Transaction Review Required',
      from: 'compliance.team@morganstanley.com',
      to: ['trading.desk@morganstanley.com', 'risk.management@morganstanley.com'],
      content: `URGENT COMPLIANCE ALERT

Large transaction detected requiring immediate review:

Client: ACME Corporation (Account #: 987654321)
Transaction Type: International wire transfer
Amount: $5,000,000 USD
Destination: Deutsche Bank AG, Frankfurt, Germany (SWIFT: DEUTDEFF)
Purpose: Acquisition funding for Tech Startup Inc.
Initiated by: John Doe, CFO (john.doe@acme-corp.com)
Authorization level: Board-approved

Risk factors:
- Amount exceeds $1M threshold
- International transfer to high-risk jurisdiction
- First-time counterparty relationship
- Transaction outside normal business pattern

ACTION REQUIRED: Review must be completed within 24 hours of this notification.
Contact: Compliance Team at compliance@morganstanley.com or (212) 555-0200

Morgan Stanley Compliance Department
1585 Broadway, New York, NY 10036`,
      date: new Date('2024-01-16T09:15:00Z')
    },
    {
      subject: 'Investment Advisory - Q1 2024 Tech Sector Opportunities',
      from: 'research.department@jpmorgan.com',
      to: ['institutional.clients@jpmorgan.com'],
      content: `Q1 2024 Technology Sector Investment Advisory

Dear Valued Clients,

Our research team has identified several high-potential opportunities in the technology sector for Q1 2024:

TOP PICKS:
1. NVIDIA Corporation (NASDAQ: NVDA) - Target price: $875 (+15% upside)
   • AI/ML chip market dominance
   • Data center revenue growth: +200% YoY
   • Current P/E: 45x (vs sector avg: 25x)

2. Amazon.com Inc. (NASDAQ: AMZN) - Target price: $180 (+20% upside)  
   • AWS cloud expansion into emerging markets
   • Prime membership growth: 15% YoY
   • Free cash flow: $35B (up 25%)

3. Tesla Inc. (NASDAQ: TSLA) - Target price: $275 (+35% upside)
   • Model Y production scaling
   • Energy storage business growth: +40% QoQ
   • Autonomous driving beta expansion

MARKET OUTLOOK:
- Tech sector expected outperformance vs S&P 500 (+8% vs +5%)
- Fed rate cuts supportive of growth stocks
- Election year volatility: moderate risk

Contact your relationship manager or email research@jpmorgan.com for detailed analysis.

Dr. Michael Chen, PhD
Chief Technology Analyst
JPMorgan Chase & Co.
383 Madison Avenue, New York, NY 10017
Phone: (212) 555-0301`,
      date: new Date('2024-01-17T08:00:00Z')
    }
  ];
  
  console.log('\n📂 Processing sample email data with spaCy...');
  
  const results: SpacyEmailProcessingResult[] = [];
  let totalEntities = 0;
  let totalContacts = 0;
  let totalKnowledgeElements = 0;
  let totalProcessingTime = 0;
  
  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 Processing Email ${index + 1}: ${email.subject}`);
    const startTime = Date.now();
    
    // Extract entities using spaCy microservice
    const extractionResult = await nlpService.extractEntities(email.content);
    
    console.log(`   🧠 spaCy service extracted ${extractionResult.entityCount} entities`);
    console.log(`   🔍 Entity types: ${[...new Set(extractionResult.entities.map(e => e.type))].join(', ')}`);
    
    // Create/find contacts
    const contacts = await processContacts(email, contactRepository);
    console.log(`   👥 Processed ${contacts.length} contacts`);
    
    // Create knowledge elements
    const knowledgeElements = await createKnowledgeElements(email, extractionResult.entities, ontology);
    console.log(`   📚 Created ${knowledgeElements.length} knowledge elements`);
    
    const processingTime = Date.now() - startTime;
    
    const result: SpacyEmailProcessingResult = {
      email: {
        subject: email.subject,
        from: email.from,
        to: email.to,
        content: email.content,
        date: email.date
      },
      entitiesExtracted: extractionResult.entityCount,
      entities: extractionResult.entities,
      contactsProcessed: contacts.length,
      knowledgeElementsCreated: knowledgeElements.length,
      processingTime
    };
    
    results.push(result);
    totalEntities += extractionResult.entityCount;
    totalContacts += contacts.length;
    totalKnowledgeElements += knowledgeElements.length;
    totalProcessingTime += processingTime;
  }
  
  // Display overall results
  console.log('\n📊 SPACY PROCESSING SUMMARY');
  console.log('=' .repeat(80));
  console.log(`📧 Total emails processed: ${results.length}`);
  console.log(`🧠 Total entities extracted: ${totalEntities}`);
  console.log(`👥 Total contacts processed: ${totalContacts}`);
  console.log(`📚 Total knowledge elements: ${totalKnowledgeElements}`);
  console.log(`⏱️  Average processing time: ${(totalProcessingTime / results.length).toFixed(0)}ms per email`);
  
  // Display ontology statistics
  const stats = ontology.getStatistics();
  console.log('\n📈 Ontology Statistics:');
  console.log(`   🔗 Total entities: ${stats.entityCount}`);
  console.log(`   🔗 Total relationships: ${stats.relationshipCount}`);
  console.log(`   📚 Knowledge elements: ${stats.knowledgeElementCount}`);
  console.log(`   📋 Activities: ${stats.activityCount}`);
  
  // Detailed email analysis
  console.log('\n\n📧 DETAILED SPACY EMAIL ANALYSIS');
  console.log('=' .repeat(80));
  
  for (const [index, result] of results.entries()) {
    displaySpacyEmailAnalysis(result, index + 1);
  }
  
  // Compare with regex results
  await compareWithRegexExtraction(sampleEmails, nlpService);
  
  // Generate comprehensive report
  await generateSpacyReport(results, stats);
  
  console.log('\n🎉 Email Ingestion Pipeline Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated:');
  console.log('   • Microservice-based NLP processing');
  console.log('   • Advanced entity extraction and categorization');
  console.log('   • Contact management');
  console.log('   • Knowledge graph population');
  console.log('   • Ontological data organization');
}

async function processContacts(email: any, contactRepository: InMemoryContactRepository): Promise<Contact[]> {
  const contacts: Contact[] = [];
  
  // Process sender
  const senderEmail = email.from;
  const senderName = extractNameFromEmail(senderEmail);
  
  try {
    let senderContact = await contactRepository.findByEmail(senderEmail);
    if (!senderContact) {
      senderContact = new Contact({
        name: senderName,
        email: senderEmail
      });
      await contactRepository.save(senderContact);
    }
    contacts.push(senderContact);
  } catch (error) {
    console.warn(`⚠️ Could not create contact for ${senderEmail}:`, error);
  }
  
  // Process recipients
  for (const recipientEmail of email.to) {
    const recipientName = extractNameFromEmail(recipientEmail);
    
    try {
      let recipientContact = await contactRepository.findByEmail(recipientEmail);
      if (!recipientContact) {
        recipientContact = new Contact({
          name: recipientName,
          email: recipientEmail
        });
        await contactRepository.save(recipientContact);
      }
      contacts.push(recipientContact);
    } catch (error) {
      console.warn(`⚠️ Could not create contact for ${recipientEmail}:`, error);
    }
  }
  
  return contacts;
}

function extractNameFromEmail(email: string): string {
  // Simple logic to extract a name from an email address
  const namePart = email.split('@')[0];
  return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function createKnowledgeElements(email: any, entities: SpacyExtractedEntity[], ontology: OCreamV2Ontology): Promise<any[]> {
  const knowledgeElements: any[] = [];
  const { subject, content, date } = email;

  // Create a central Information Element for the email content
  const emailContentElement = createInformationElement({
    type: KnowledgeType.DOCUMENT,
    content: content,
    source: 'Email Ingestion',
    timestamp: date.toISOString(),
  });
  ontology.addInformationElement(emailContentElement);
  knowledgeElements.push(emailContentElement);

  // Link entities to the email content
  for (const entity of entities) {
    const entityElement = createInformationElement({
      type: KnowledgeType.ENTITY,
      content: entity.value,
      attributes: {
        entity_type: entity.type,
        confidence: entity.confidence
      },
      source: 'spaCy NLP Service',
      timestamp: new Date().toISOString()
    });
    ontology.addInformationElement(entityElement);
    ontology.addRelationship(emailContentElement, entityElement, DOLCECategory.MENTIONS);
    knowledgeElements.push(entityElement);
  }

  // Create an Activity element for the email communication
  const activityElement = ontology.createActivity({
    type: 'Email Communication',
    description: `Email: ${subject}`,
    startTime: date.toISOString(),
    endTime: date.toISOString(),
  });
  ontology.addActivity(activityElement);
  ontology.addRelationship(activityElement, emailContentElement, DOLCECategory.HAS_PARTICIPANT);

  return knowledgeElements;
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

  console.log('\n💡 Business Insights:');
  const insights = extractBusinessInsights(result.email.content);
  if (insights.length > 0) {
    insights.forEach(insight => console.log(`  - ${insight}`));
  } else {
    console.log('  No specific business insights derived.');
  }
}

function classifyEmailContent(content: string): string {
  if (content.toLowerCase().includes('compliance') || content.toLowerCase().includes('urgent')) return 'Compliance';
  if (content.toLowerCase().includes('portfolio') || content.toLowerCase().includes('holdings')) return 'Portfolio Management';
  if (content.toLowerCase().includes('investment') || content.toLowerCase().includes('opportunities')) return 'Investment Advisory';
  return 'General';
}

function extractBusinessInsights(content: string): string[] {
  const insights: string[] = [];
  const classification = classifyEmailContent(content);

  switch (classification) {
    case 'Compliance':
      insights.push('High-priority compliance review detected.');
      const moneyMatch = content.match(/\$[\d,.]+/);
      if (moneyMatch) insights.push(`Transaction amount: ${moneyMatch[0]}`);
      break;
    case 'Portfolio Management':
      insights.push('Portfolio review communication.');
      const holdings = content.match(/-\s(.*?)\s\(/g);
      if (holdings) insights.push(`Discusses ${holdings.length} holdings.`);
      break;
    case 'Investment Advisory':
      insights.push('Distribution of research material.');
      const topPicks = content.match(/TOP PICKS:|Key Opportunities:/);
      if (topPicks) insights.push('Contains specific investment recommendations.');
      break;
  }
  return insights;
}

async function compareWithRegexExtraction(sampleEmails: any[], nlpService: SpacyEntityExtractionService) {
  console.log('\n\n🔄 COMPARISON: spaCy vs. Regex');
  console.log('=' .repeat(80));

  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n--- Comparison for Email ${index + 1} ---`);

    // Get spaCy results
    const spacyResult = await nlpService.extractEntities(email.content);
    
    // Get regex results (simplified version)
    const regexEntities = extractEntitiesWithRegex(email.content);
    
    console.log(`   🧠 spaCy: ${spacyResult.entityCount} entities`);
    console.log(`   📝 Regex: ${regexEntities.length} entities`);

    const spacyTypes = new Set(spacyResult.entities.map((e: any) => e.type));
    const regexTypes = new Set(regexEntities.map((e: any) => e.type));

    console.log(`   • spaCy types: ${[...spacyTypes].join(', ')}`);
    console.log(`   • Regex types: ${[...regexTypes].join(', ')}`);
  }
}

function extractEntitiesWithRegex(content: string): Array<{type: string, value: string, confidence: number}> {
  const entities: Array<{type: string, value: string, confidence: number}> = [];
  
  // Simplified regex for comparison
  const patterns: { [key: string]: RegExp } = {
    'ORG': /\b[A-Z][a-z]+ (?:Inc\.|Corp\.|Group|LLC|Ltd\.)/g,
    'MONEY': /\$[\d,]+(?:\.\d{2})?/g,
    'PRODUCT': /\((?:NASDAQ|NYSE): ([A-Z]+)\)/g,
    'PERSON': /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
  };

  for (const type in patterns) {
    const matches = content.match(patterns[type]) || [];
    matches.forEach(value => {
      entities.push({ type, value: value.trim(), confidence: 0.7 });
    });
  }
  return entities;
}

async function generateSpacyReport(results: SpacyEmailProcessingResult[], stats: any) {
  let report = '<h1>spaCy Email Ingestion Report</h1>\n';
  report += `<p>Generated on: ${new Date().toUTCString()}</p>\n`;
  
  report += '<h2>Overall Statistics</h2>\n';
  report += '<ul>';
  report += `<li>Total Emails Processed: ${results.length}</li>`;
  report += `<li>Total Entities Extracted: ${results.reduce((acc, r) => acc + r.entitiesExtracted, 0)}</li>`;
  report += `<li>Total Knowledge Elements: ${stats.knowledgeElementCount}</li>`;
  report += `<li>Average Processing Time: ${(results.reduce((acc, r) => acc + r.processingTime, 0) / results.length).toFixed(0)}ms</li>`;
  report += '</ul>\n';

  report += '<h2>Ontology Summary</h2>\n';
  report += '<ul>';
  report += `<li>Entities: ${stats.entityCount}</li>`;
  report += `<li>Relationships: ${stats.relationshipCount}</li>`;
  report += `<li>Activities: ${stats.activityCount}</li>`;
  report += '</ul>\n';
  
  report += '<h2>Detailed Analysis per Email</h2>\n';
  for (const [index, result] of results.entries()) {
    report += `<h3>Email ${index + 1}: ${result.email.subject}</h3>\n`;
    report += '<ul>';
    report += `<li>From: ${result.email.from}</li>`;
    report += `<li>Date: ${result.email.date.toUTCString()}</li>`;
    report += `<li>Entities: ${result.entitiesExtracted}</li>`;
    report += '</ul>';
    
    report += '<h4>Extracted Entities:</h4>\n';
    if (result.entities.length > 0) {
      const entityGroups: { [key: string]: any[] } = {};
      result.entities.forEach(e => {
        if (!entityGroups[e.type]) entityGroups[e.type] = [];
        entityGroups[e.type].push(e);
      });
      report += '<ul>';
      for (const type in entityGroups) {
        report += `<li><b>${type}</b>: ${entityGroups[type].map(e => `"${e.value}"`).join(', ')}</li>`;
      }
      report += '</ul>';
    } else {
      report += '<p>No entities found.</p>';
    }
  }

  const reportPath = join(__dirname, '../../email-processing-report.html');
  writeFileSync(reportPath, report);
  console.log(`\n\n📄 Detailed HTML report generated at: ${reportPath}`);
}

// Run the demo
if (require.main === module) {
  demonstrateSpacyEmailIngestionPipeline().catch(console.error);
}

export { demonstrateSpacyEmailIngestionPipeline }; 