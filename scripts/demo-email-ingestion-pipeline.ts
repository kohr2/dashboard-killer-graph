// Email Ingestion Pipeline Demo - Simplified Working Version
// Demonstrates core functionality without complex dependencies

import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { OCreamV2Ontology, DOLCECategory, createInformationElement, KnowledgeType } from '../src/crm-core/domain/ontology/o-cream-v2';
import { Contact } from '../src/crm-core/domain/entities/contact';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface SimpleEmailProcessingResult {
  email: {
    subject: string;
    from: string;
    to: string[];
    content: string;
    date: Date;
  };
  entitiesExtracted: number;
  entities: Array<{type: string, value: string, confidence: number}>;
  contactsProcessed: number;
  knowledgeElementsCreated: number;
}

async function demonstrateEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - Simplified Version');
  console.log('=' .repeat(100));
  console.log('Demonstrating core functionality: Entity extraction → Contact creation → Knowledge graph');
  
  // Initialize services
  const contactRepository = new InMemoryContactRepository();
  const ontology = OCreamV2Ontology.getInstance();
  
  console.log('\n🔧 Initialized services:');
  console.log('   ✅ Contact Repository (In-Memory)');
  console.log('   ✅ O-CREAM-v2 Ontology');
  
  // Sample email data (simulating .eml file processing)
  const sampleEmails = [
    {
      subject: 'Portfolio Review Meeting - Goldman Sachs Holdings',
      from: 'sarah.johnson@goldmansachs.com',
      to: ['robert.smith@email.com'],
      content: `Dear Mr. Smith,

Your portfolio review is scheduled for next Tuesday at 2 PM. 

Current holdings:
- Goldman Sachs Group Inc. (NYSE: GS) - $350,000 position
- Apple Inc. (NASDAQ: AAPL) - $125,000 position
- Microsoft Corp. (NASDAQ: MSFT) - $200,000 position

Total portfolio value: $2,500,000

Please review the attached documents and let me know if you have any questions.

Best regards,
Sarah Johnson, CFA
Senior Portfolio Manager`,
      date: new Date('2024-01-15T14:30:00Z')
    },
    {
      subject: 'Compliance Alert - Transaction Review Required',
      from: 'compliance@morganstanley.com',
      to: ['trading.desk@morganstanley.com'],
      content: `URGENT: Compliance Review Required

Large transaction detected:
- Client: ACME Corp
- Transaction: $5,000,000 wire transfer
- Destination: Deutsche Bank AG
- Purpose: Acquisition funding

Please review within 24 hours.

Compliance Team`,
      date: new Date('2024-01-16T09:15:00Z')
    },
    {
      subject: 'Investment Advisory - Tech Sector Opportunities',
      from: 'research@jpmorgan.com',
      to: ['clients@jpmorgan.com'],
      content: `Tech Sector Weekly Update

Key Opportunities:
- NVIDIA Corporation (NASDAQ: NVDA) - Strong AI growth potential
- Amazon.com Inc. (NASDAQ: AMZN) - Cloud expansion
- Tesla Inc. (NASDAQ: TSLA) - EV market leadership

Market outlook: Bullish on technology sector for Q2 2024.

JPMorgan Research Team`,
      date: new Date('2024-01-17T08:00:00Z')
    }
  ];
  
  console.log('\n📂 Processing sample email data...');
  
  const results: SimpleEmailProcessingResult[] = [];
  let totalEntities = 0;
  let totalContacts = 0;
  let totalKnowledgeElements = 0;
  
  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 Processing Email ${index + 1}: ${email.subject}`);
    
    // Simulate entity extraction
    const entities = extractEntitiesFromContent(email.content);
    console.log(`   🔍 Extracted ${entities.length} entities: ${entities.map(e => e.type).join(', ')}`);
    
    // Create/find contacts
    const contacts = await processContacts(email, contactRepository);
    console.log(`   👥 Processed ${contacts.length} contacts`);
    
    // Create knowledge elements
    const knowledgeElements = await createKnowledgeElements(email, entities, ontology);
    console.log(`   📚 Created ${knowledgeElements.length} knowledge elements`);
    
    const result: SimpleEmailProcessingResult = {
      email: {
        subject: email.subject,
        from: email.from,
        to: email.to,
        content: email.content,
        date: email.date
      },
      entitiesExtracted: entities.length,
      entities: entities,
      contactsProcessed: contacts.length,
      knowledgeElementsCreated: knowledgeElements.length
    };
    
    results.push(result);
    totalEntities += entities.length;
    totalContacts += contacts.length;
    totalKnowledgeElements += knowledgeElements.length;
  }
  
  // Display overall results
  console.log('\n📊 PROCESSING SUMMARY');
  console.log('=' .repeat(80));
  console.log(`📧 Total emails processed: ${results.length}`);
  console.log(`🔍 Total entities extracted: ${totalEntities}`);
  console.log(`👥 Total contacts processed: ${totalContacts}`);
  console.log(`📚 Total knowledge elements: ${totalKnowledgeElements}`);
  
  // Display ontology statistics
  const stats = ontology.getStatistics();
  console.log('\n📈 Ontology Statistics:');
  console.log(`   🔗 Total entities: ${stats.entityCount}`);
  console.log(`   🔗 Total relationships: ${stats.relationshipCount}`);
  console.log(`   📚 Knowledge elements: ${stats.knowledgeElementCount}`);
  console.log(`   📋 Activities: ${stats.activityCount}`);
  
  // Detailed email analysis
  console.log('\n\n📧 DETAILED EMAIL ANALYSIS');
  console.log('=' .repeat(80));
  
  for (const [index, result] of results.entries()) {
    displayEmailAnalysis(result, index + 1);
  }
  
  // Generate comprehensive report
  await generateSimpleReport(results, stats);
  
  console.log('\n🎉 Email Ingestion Pipeline Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated:');
  console.log('   • Email content processing');
  console.log('   • Entity extraction and categorization');
  console.log('   • Contact management');
  console.log('   • Knowledge graph population');
  console.log('   • Ontological data organization');
  console.log('\n💡 Next steps would include:');
  console.log('   • Integration with actual .eml file parsing');
  console.log('   • Advanced NLP with spaCy models');
  console.log('   • Financial ontology integration (FIBO)');
  console.log('   • Neo4j knowledge graph storage');
  console.log('   • Real-time processing pipeline');
}

function extractEntitiesFromContent(content: string): Array<{type: string, value: string, confidence: number}> {
  const entities: Array<{type: string, value: string, confidence: number}> = [];
  
  // Simple pattern-based entity extraction (in production, would use spaCy)
  
  // Email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = content.match(emailPattern) || [];
  emails.forEach(email => {
    entities.push({ type: 'EMAIL_ADDRESS', value: email, confidence: 0.95 });
  });
  
  // Company names (simple heuristic)
  const companyPattern = /(Inc\.|Corp\.|Corporation|LLC|Ltd\.|Group|AG|Bank)/g;
  const companies = content.match(/\b[\w\s]+(?:Inc\.|Corp\.|Corporation|LLC|Ltd\.|Group|AG|Bank)\b/g) || [];
  companies.forEach(company => {
    entities.push({ type: 'COMPANY_NAME', value: company.trim(), confidence: 0.8 });
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
  
  // Person names (simple heuristic)
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  const names = content.match(namePattern) || [];
  names.forEach(name => {
    // Filter out obvious non-names
    if (!name.includes('Corp') && !name.includes('Inc') && !name.includes('Bank')) {
      entities.push({ type: 'PERSON_NAME', value: name, confidence: 0.7 });
    }
  });
  
  return entities;
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

async function createKnowledgeElements(email: any, entities: any[], ontology: OCreamV2Ontology): Promise<any[]> {
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
      date: email.date
    },
    source: 'email_processing',
    reliability: 0.9,
    confidentiality: 'internal'
  });
  
  ontology.addEntity(commKnowledge);
  knowledgeElements.push(commKnowledge);
  
  // Create entity knowledge elements
  for (const entity of entities) {
    const entityKnowledge = createInformationElement({
      title: `Entity: ${entity.type}`,
      type: KnowledgeType.CUSTOMER_PROFILE,
      content: {
        entityType: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        extractedFrom: email.subject
      },
      source: 'entity_extraction',
      reliability: entity.confidence,
      confidentiality: 'internal'
    });
    
    ontology.addEntity(entityKnowledge);
    knowledgeElements.push(entityKnowledge);
  }
  
  return knowledgeElements;
}

function displayEmailAnalysis(result: SimpleEmailProcessingResult, emailNumber: number) {
  console.log(`\n📧 EMAIL ${emailNumber}: ${result.email.subject}`);
  console.log('-' .repeat(80));
  console.log(`📨 From: ${result.email.from}`);
  console.log(`📬 To: ${result.email.to.join(', ')}`);
  console.log(`📅 Date: ${result.email.date.toLocaleString()}`);
  console.log(`🔍 Entities extracted: ${result.entitiesExtracted}`);
  console.log(`👥 Contacts processed: ${result.contactsProcessed}`);
  console.log(`📚 Knowledge elements: ${result.knowledgeElementsCreated}`);
  
  // Show email classification
  const classification = classifyEmailContent(result.email.content);
  console.log(`🏷️ Classification: ${classification}`);
  
  // Show extracted insights
  const insights = extractBusinessInsights(result.email.content);
  console.log(`💡 Business insights: ${insights.join(', ')}`);
  
  // Show all extracted entities
  if (result.entities.length > 0) {
    console.log(`\n🔍 EXTRACTED ENTITIES (${result.entities.length}):`);
    
    // Group entities by type for better organization
    const entitiesByType: Record<string, Array<{value: string, confidence: number}>> = {};
    result.entities.forEach(entity => {
      if (!entitiesByType[entity.type]) {
        entitiesByType[entity.type] = [];
      }
      entitiesByType[entity.type].push({ value: entity.value, confidence: entity.confidence });
    });
    
    // Display entities grouped by type
    Object.entries(entitiesByType).forEach(([type, entities]) => {
      console.log(`\n   📌 ${type} (${entities.length}):`);
      entities.forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.7 ? '🟡' : '🔴';
        const confidencePercent = (entity.confidence * 100).toFixed(1);
        console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" (${confidencePercent}%)`);
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

async function generateSimpleReport(results: SimpleEmailProcessingResult[], stats: any) {
  console.log('\n📄 Generating processing report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalEmails: results.length,
      totalEntities: results.reduce((sum, r) => sum + r.entitiesExtracted, 0),
      totalContacts: results.reduce((sum, r) => sum + r.contactsProcessed, 0),
      totalKnowledgeElements: results.reduce((sum, r) => sum + r.knowledgeElementsCreated, 0)
    },
    emailAnalysis: results.map(result => ({
      subject: result.email.subject,
      from: result.email.from,
      date: result.email.date,
      entitiesExtracted: result.entitiesExtracted,
      entities: result.entities,
      contactsProcessed: result.contactsProcessed,
      knowledgeElementsCreated: result.knowledgeElementsCreated,
      classification: classifyEmailContent(result.email.content),
      insights: extractBusinessInsights(result.email.content)
    })),
    ontologyStatistics: stats
  };
  
  // Save report to file
  const reportPath = join(__dirname, '../email-processing-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`   ✅ Report saved to: ${reportPath}`);
  console.log(`   📊 Report contains ${report.emailAnalysis.length} email analyses`);
}

// Run the demo
if (require.main === module) {
  demonstrateEmailIngestionPipeline().catch(console.error);
}

export { demonstrateEmailIngestionPipeline }; 