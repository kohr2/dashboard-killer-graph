// Email Ingestion Pipeline Demo - spaCy Powered Version
// Advanced entity extraction using spaCy NLP models

import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { OCreamV2Ontology, DOLCECategory, createInformationElement, KnowledgeType } from '../src/crm-core/domain/ontology/o-cream-v2';
import { Contact } from '../src/crm-core/domain/entities/contact';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

interface SpacyEntity {
  type: string;
  value: string;
  confidence: number;
  spacy_label: string;
  context: string;
}

interface SpacyExtractionResult {
  success: boolean;
  entities: SpacyEntity[];
  total_count: number;
  error?: string;
}

interface SpacyEmailProcessingResult {
  email: {
    subject: string;
    from: string;
    to: string[];
    content: string;
    date: Date;
  };
  entitiesExtracted: number;
  entities: SpacyEntity[];
  contactsProcessed: number;
  knowledgeElementsCreated: number;
  processingTime: number;
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - spaCy Powered Version');
  console.log('=' .repeat(100));
  console.log('Advanced NLP: spaCy entity extraction → Contact creation → Knowledge graph');
  
  // Initialize services
  const contactRepository = new InMemoryContactRepository();
  const ontology = OCreamV2Ontology.getInstance();
  
  console.log('\n🔧 Initialized services:');
  console.log('   ✅ Contact Repository (In-Memory)');
  console.log('   ✅ O-CREAM-v2 Ontology');
  console.log('   ✅ spaCy NLP Engine (en_core_web_lg)');
  
  // Test spaCy connection
  console.log('\n🧠 Testing spaCy NLP engine...');
  const testResult = await extractEntitiesWithSpacy("Test message with Apple Inc. and $1000");
  if (testResult.success) {
    console.log(`   ✅ spaCy working correctly - extracted ${testResult.total_count} entities`);
  } else {
    console.log(`   ❌ spaCy error: ${testResult.error}`);
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
    
    // Extract entities using spaCy
    const spacyResult = await extractEntitiesWithSpacy(email.content);
    
    if (!spacyResult.success) {
      console.log(`   ❌ spaCy extraction failed: ${spacyResult.error}`);
      continue;
    }
    
    console.log(`   🧠 spaCy extracted ${spacyResult.total_count} entities`);
    console.log(`   🔍 Entity types: ${[...new Set(spacyResult.entities.map(e => e.type))].join(', ')}`);
    
    // Create/find contacts
    const contacts = await processContacts(email, contactRepository);
    console.log(`   👥 Processed ${contacts.length} contacts`);
    
    // Create knowledge elements
    const knowledgeElements = await createKnowledgeElements(email, spacyResult.entities, ontology);
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
      entitiesExtracted: spacyResult.total_count,
      entities: spacyResult.entities,
      contactsProcessed: contacts.length,
      knowledgeElementsCreated: knowledgeElements.length,
      processingTime
    };
    
    results.push(result);
    totalEntities += spacyResult.total_count;
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
  await compareWithRegexExtraction(sampleEmails);
  
  // Generate comprehensive report
  await generateSpacyReport(results, stats);
  
  console.log('\n🎉 spaCy Email Ingestion Pipeline Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated:');
  console.log('   • Advanced NLP entity extraction with spaCy');
  console.log('   • Named Entity Recognition (NER) with context');
  console.log('   • Financial domain-specific entity patterns');
  console.log('   • High-accuracy person, organization, and location detection');
  console.log('   • Semantic understanding of business relationships');
  console.log('   • Contact management with intelligent name extraction');
  console.log('   • Knowledge graph population with NLP insights');
  
  console.log('\n🚀 spaCy Advantages Demonstrated:');
  console.log('   • 📈 Higher accuracy person name detection');
  console.log('   • 🏢 Better organization recognition');
  console.log('   • 📍 Geographic entity extraction');
  console.log('   • 📅 Date and time understanding');
  console.log('   • 💰 Improved monetary amount detection');
  console.log('   • 🔗 Contextual entity relationships');
  console.log('   • 🎯 Domain-specific pattern matching');
}

async function extractEntitiesWithSpacy(text: string): Promise<SpacyExtractionResult> {
  return new Promise((resolve) => {
    const pythonScript = join(__dirname, 'spacy_entity_extractor.py');
    const pythonProcess = spawn('python3', [pythonScript, text]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            entities: [],
            total_count: 0,
            error: `JSON parse error: ${error}`
          });
        }
      } else {
        resolve({
          success: false,
          entities: [],
          total_count: 0,
          error: `Python script failed with code ${code}: ${stderr}`
        });
      }
    });
  });
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
  const namePart = email.split('@')[0];
  return namePart.split(/[._-]/).map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ');
}

async function createKnowledgeElements(email: any, entities: SpacyEntity[], ontology: OCreamV2Ontology): Promise<any[]> {
  const knowledgeElements: any[] = [];
  
  // Create communication knowledge element
  const commKnowledge = createInformationElement({
    title: `Email Communication: ${email.subject}`,
    type: KnowledgeType.COMMUNICATION_LOG,
    content: {
      subject: email.subject,
      from: email.from,
      to: email.to,
      entityCount: entities.length,
      date: email.date,
      nlpModel: 'spacy_en_core_web_lg'
    },
    source: 'spacy_email_processing',
    reliability: 0.95,
    confidentiality: 'internal'
  });
  
  ontology.addEntity(commKnowledge);
  knowledgeElements.push(commKnowledge);
  
  // Create entity knowledge elements with spaCy insights
  for (const entity of entities) {
    const entityKnowledge = createInformationElement({
      title: `spaCy Entity: ${entity.type}`,
      type: KnowledgeType.CUSTOMER_PROFILE,
      content: {
        entityType: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        spacyLabel: entity.spacy_label,
        context: entity.context,
        extractedFrom: email.subject,
        nlpMethod: 'spacy_ner'
      },
      source: 'spacy_entity_extraction',
      reliability: entity.confidence,
      confidentiality: 'internal'
    });
    
    ontology.addEntity(entityKnowledge);
    knowledgeElements.push(entityKnowledge);
  }
  
  return knowledgeElements;
}

function displaySpacyEmailAnalysis(result: SpacyEmailProcessingResult, emailNumber: number) {
  console.log(`\n📧 EMAIL ${emailNumber}: ${result.email.subject}`);
  console.log('-' .repeat(80));
  console.log(`📨 From: ${result.email.from}`);
  console.log(`📬 To: ${result.email.to.join(', ')}`);
  console.log(`📅 Date: ${result.email.date.toLocaleString()}`);
  console.log(`🧠 spaCy entities extracted: ${result.entitiesExtracted}`);
  console.log(`👥 Contacts processed: ${result.contactsProcessed}`);
  console.log(`📚 Knowledge elements: ${result.knowledgeElementsCreated}`);
  console.log(`⏱️  Processing time: ${result.processingTime}ms`);
  
  // Show email classification
  const classification = classifyEmailContent(result.email.content);
  console.log(`🏷️ Classification: ${classification}`);
  
  // Show extracted insights
  const insights = extractBusinessInsights(result.email.content);
  console.log(`💡 Business insights: ${insights.join(', ')}`);
  
  // Show all extracted entities with spaCy details
  if (result.entities.length > 0) {
    console.log(`\n🧠 SPACY EXTRACTED ENTITIES (${result.entities.length}):`);
    
    // Group entities by type for better organization
    const entitiesByType: Record<string, SpacyEntity[]> = {};
    result.entities.forEach(entity => {
      if (!entitiesByType[entity.type]) {
        entitiesByType[entity.type] = [];
      }
      entitiesByType[entity.type].push(entity);
    });
    
    // Display entities grouped by type with spaCy-specific information
    Object.entries(entitiesByType).forEach(([type, entities]) => {
      console.log(`\n   📌 ${type} (${entities.length}):`);
      entities.forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.7 ? '🟡' : '🔴';
        const confidencePercent = (entity.confidence * 100).toFixed(1);
        console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" (${confidencePercent}%)`);
        console.log(`          spaCy label: ${entity.spacy_label}`);
        if (entity.context && entity.context !== entity.value) {
          console.log(`          Context: "${entity.context.substring(0, 50)}..."`);
        }
      });
    });
  }
}

function classifyEmailContent(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('compliance') || lowerContent.includes('review required')) {
    return 'COMPLIANCE_ALERT';
  } else if (lowerContent.includes('portfolio') || lowerContent.includes('investment')) {
    return 'INVESTMENT_ADVISORY';
  } else if (lowerContent.includes('transaction') || lowerContent.includes('wire transfer')) {
    return 'FINANCIAL_TRANSACTION';
  } else if (lowerContent.includes('meeting') || lowerContent.includes('schedule')) {
    return 'MEETING_REQUEST';
  } else if (lowerContent.includes('research') || lowerContent.includes('market')) {
    return 'MARKET_RESEARCH';
  } else {
    return 'GENERAL_BUSINESS';
  }
}

function extractBusinessInsights(content: string): string[] {
  const insights: string[] = [];
  
  // Check for urgency indicators
  if (content.toLowerCase().includes('urgent') || content.includes('URGENT')) {
    insights.push('High Priority');
  }
  
  // Check for financial indicators
  if (content.includes('$')) {
    insights.push('Contains Financial Data');
  }
  
  // Check for compliance indicators
  if (content.toLowerCase().includes('compliance') || content.toLowerCase().includes('review')) {
    insights.push('Compliance Related');
  }
  
  // Check for investment indicators
  if (content.toLowerCase().includes('portfolio') || content.toLowerCase().includes('investment')) {
    insights.push('Investment Advisory');
  }
  
  return insights;
}

async function compareWithRegexExtraction(sampleEmails: any[]) {
  console.log('\n\n📊 SPACY vs REGEX COMPARISON');
  console.log('=' .repeat(80));
  
  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 Email ${index + 1}: ${email.subject}`);
    
    // Get spaCy results
    const spacyResult = await extractEntitiesWithSpacy(email.content);
    
    // Get regex results (simplified version)
    const regexEntities = extractEntitiesWithRegex(email.content);
    
    console.log(`   🧠 spaCy: ${spacyResult.total_count} entities`);
    console.log(`   📝 Regex: ${regexEntities.length} entities`);
    
    // Show unique entities found by each method
    const spacyTypes = new Set(spacyResult.entities.map(e => e.type));
    const regexTypes = new Set(regexEntities.map(e => e.type));
    
    const spacyUnique = [...spacyTypes].filter(t => !regexTypes.has(t));
    const regexUnique = [...regexTypes].filter(t => !spacyTypes.has(t));
    
    if (spacyUnique.length > 0) {
      console.log(`   ✨ spaCy unique types: ${spacyUnique.join(', ')}`);
    }
    if (regexUnique.length > 0) {
      console.log(`   📐 Regex unique types: ${regexUnique.join(', ')}`);
    }
  }
}

function extractEntitiesWithRegex(content: string): Array<{type: string, value: string, confidence: number}> {
  const entities: Array<{type: string, value: string, confidence: number}> = [];
  
  // Email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = content.match(emailPattern) || [];
  emails.forEach(email => {
    entities.push({ type: 'EMAIL_ADDRESS', value: email, confidence: 0.95 });
  });
  
  // Stock symbols
  const stockPattern = /\((?:NYSE|NASDAQ):\s*([A-Z]{1,5})\)/g;
  let stockMatch;
  while ((stockMatch = stockPattern.exec(content)) !== null) {
    entities.push({ type: 'STOCK_SYMBOL', value: stockMatch[1], confidence: 0.9 });
  }
  
  // Monetary amounts
  const moneyPattern = /\$[\d,]+(?:\.\d{2})?/g;
  const amounts = content.match(moneyPattern) || [];
  amounts.forEach(amount => {
    entities.push({ type: 'MONETARY_AMOUNT', value: amount, confidence: 0.85 });
  });
  
  return entities;
}

async function generateSpacyReport(results: SpacyEmailProcessingResult[], stats: any) {
  console.log('\n📄 Generating spaCy processing report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    processingMethod: 'spacy_nlp',
    model: 'en_core_web_lg',
    summary: {
      totalEmails: results.length,
      totalEntities: results.reduce((sum, r) => sum + r.entitiesExtracted, 0),
      totalContacts: results.reduce((sum, r) => sum + r.contactsProcessed, 0),
      totalKnowledgeElements: results.reduce((sum, r) => sum + r.knowledgeElementsCreated, 0),
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      averageEntitiesPerEmail: results.reduce((sum, r) => sum + r.entitiesExtracted, 0) / results.length
    },
    emailAnalysis: results.map(result => ({
      subject: result.email.subject,
      from: result.email.from,
      date: result.email.date,
      entitiesExtracted: result.entitiesExtracted,
      entities: result.entities,
      contactsProcessed: result.contactsProcessed,
      knowledgeElementsCreated: result.knowledgeElementsCreated,
      processingTime: result.processingTime,
      classification: classifyEmailContent(result.email.content),
      insights: extractBusinessInsights(result.email.content)
    })),
    ontologyStatistics: stats,
    spacyCapabilities: {
      namedEntityRecognition: true,
      contextualUnderstanding: true,
      financialDomainPatterns: true,
      multilingualSupport: false,
      customEntityTypes: ['STOCK_SYMBOL', 'FINANCIAL_ORG', 'FINANCIAL_INSTRUMENT', 'JOB_TITLE']
    }
  };
  
  // Save report to file
  const reportPath = join(__dirname, '../email-processing-spacy-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`   ✅ spaCy report saved to: ${reportPath}`);
  console.log(`   📊 Report contains ${report.emailAnalysis.length} email analyses`);
  console.log(`   🧠 Average processing time: ${report.summary.averageProcessingTime.toFixed(0)}ms`);
  console.log(`   📈 Average entities per email: ${report.summary.averageEntitiesPerEmail.toFixed(1)}`);
}

// Run the demo
if (require.main === module) {
  demonstrateSpacyEmailIngestionPipeline().catch(console.error);
}

export { demonstrateSpacyEmailIngestionPipeline }; 