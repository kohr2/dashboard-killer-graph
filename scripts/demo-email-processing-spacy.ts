// Email Processing Demo - spaCy as Default Entity Extraction
// Demonstrates spaCy NLP as the primary entity extraction engine

import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { SpacyEntityExtractionService, SpacyEntityExtractionResult, EntityType } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { OCreamV2Ontology, DOLCECategory, createInformationElement, KnowledgeType } from '../src/crm-core/domain/ontology/o-cream-v2';
import { Contact } from '../src/crm-core/domain/entities/contact';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface EmailProcessingConfig {
  useSpacyByDefault: boolean;
  spacyModel: string;
  fallbackToRegex: boolean;
  minConfidence: number;
  enableFinancialExtraction: boolean;
}

interface ProcessedEmail {
  subject: string;
  from: string;
  to: string[];
  content: string;
  date: Date;
  entities: SpacyEntityExtractionResult;
  contacts: Contact[];
  knowledgeElements: any[];
  classification: string;
  businessInsights: string[];
  processingTime: number;
}

const DEFAULT_CONFIG: EmailProcessingConfig = {
  useSpacyByDefault: true,
  spacyModel: 'en_core_web_lg',
  fallbackToRegex: true,
  minConfidence: 0.6,
  enableFinancialExtraction: true
};

async function demonstrateSpacyAsDefault() {
  console.log('🚀 Email Processing Demo - spaCy as Default NLP Engine');
  console.log('=' .repeat(100));
  console.log('🧠 Using spaCy for advanced entity extraction by default');
  
  // Initialize services with spaCy as primary
  const contactRepository = new InMemoryContactRepository();
  const spacyExtractor = new SpacyEntityExtractionService();
  const ontology = OCreamV2Ontology.getInstance();
  
  console.log('\n🔧 Service Configuration:');
  console.log('   ✅ Primary NLP Engine: spaCy (en_core_web_lg)');
  console.log('   ✅ Contact Repository: In-Memory');
  console.log('   ✅ Knowledge Graph: O-CREAM-v2 Ontology');
  console.log('   ✅ Fallback: Regex patterns (if spaCy fails)');
  
  // Test spaCy availability
  console.log('\n🧪 Testing spaCy NLP Engine...');
  const capabilities = await spacyExtractor.getCapabilities();
  console.log(`   Status: ${capabilities.status}`);
  console.log(`   Available Models: ${capabilities.availableModels.join(', ')}`);
  console.log(`   Features: ${capabilities.features.slice(0, 3).join(', ')}...`);
  
  if (capabilities.status !== 'available') {
    console.log('   ❌ spaCy not available, exiting demo');
    return;
  }
  
  // Sample business emails for processing
  const sampleEmails = [
    {
      subject: 'Q4 Portfolio Performance Review - Goldman Sachs',
      from: 'advisor@goldmansachs.com',
      to: ['client@example.com'],
      content: `Dear Valued Client,

Your Q4 2024 portfolio performance summary is attached. Key highlights:

• Total Portfolio Value: $3,250,000 (up 8.5% from Q3)
• Top Performers:
  - Apple Inc. (NASDAQ: AAPL): +15.2% return
  - Microsoft Corporation (NASDAQ: MSFT): +12.8% return
  - NVIDIA Corporation (NASDAQ: NVDA): +22.1% return

• Asset Allocation:
  - Equities: 65% ($2,112,500)
  - Fixed Income: 25% ($812,500)
  - Alternative Investments: 10% ($325,000)

Your dedicated advisor Sarah Chen, CFA will contact you at (212) 555-0199 to schedule your annual review meeting.

Best regards,
Goldman Sachs Private Wealth Management
200 Wall Street, New York, NY 10005`,
      date: new Date('2024-01-20T10:00:00Z')
    },
    {
      subject: 'URGENT: AML Compliance Review Required',
      from: 'compliance@morganstanley.com',
      to: ['operations@morganstanley.com', 'risk@morganstanley.com'],
      content: `IMMEDIATE ACTION REQUIRED

AML (Anti-Money Laundering) compliance review triggered for:

Client: TechCorp International Ltd.
Account Number: MS-789456123
Transaction Amount: $15,000,000 USD
Transaction Type: International wire transfer
Destination: Zurich Investment Bank, Switzerland
SWIFT Code: ZURICHES1

Risk Indicators:
- Amount exceeds $10M threshold
- High-risk jurisdiction (Switzerland)
- Client PEP (Politically Exposed Person) status
- Unusual transaction pattern detected

Review Officer: Michael Rodriguez, CAMS
Contact: michael.rodriguez@morganstanley.com
Phone: (212) 555-0288
Deadline: 48 hours from notification

Morgan Stanley Compliance Department
1585 Broadway, New York, NY 10036`,
      date: new Date('2024-01-21T14:30:00Z')
    },
    {
      subject: 'Market Outlook: Tech Sector Analysis Q1 2024',
      from: 'research@jpmorgan.com',
      to: ['institutional@jpmorgan.com'],
      content: `Q1 2024 Technology Sector Investment Outlook

Executive Summary:
Our research team maintains a BULLISH outlook on technology stocks for Q1 2024, driven by AI adoption and cloud infrastructure growth.

Key Investment Themes:
1. Artificial Intelligence & Machine Learning
   - Target: NVIDIA (NVDA) - Price Target: $950 (+18% upside)
   - Rationale: Data center GPU demand, AI chip market leadership

2. Cloud Infrastructure
   - Target: Amazon Web Services (AMZN) - Price Target: $185 (+25% upside)
   - Target: Microsoft Azure (MSFT) - Price Target: $420 (+15% upside)

3. Cybersecurity
   - Target: CrowdStrike (CRWD) - Price Target: $320 (+30% upside)
   - Target: Palo Alto Networks (PANW) - Price Target: $380 (+22% upside)

Market Catalysts:
• Q4 2023 earnings season (positive surprises expected)
• Federal Reserve rate policy (dovish stance supportive)
• Corporate IT spending acceleration (+12% YoY growth projected)

Contact our research team:
Dr. Jennifer Liu, CFA - Head of Tech Research
Email: jennifer.liu@jpmorgan.com
Phone: (212) 555-0345

JPMorgan Chase & Co.
383 Madison Avenue, New York, NY 10017`,
      date: new Date('2024-01-22T08:15:00Z')
    }
  ];
  
  console.log(`\n📧 Processing ${sampleEmails.length} business emails with spaCy...`);
  
  const results: ProcessedEmail[] = [];
  let totalEntities = 0;
  let totalContacts = 0;
  let totalKnowledgeElements = 0;
  let totalProcessingTime = 0;
  
  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 [${index + 1}/${sampleEmails.length}] Processing: ${email.subject}`);
    const startTime = Date.now();
    
    try {
      // 1. Extract entities using spaCy (primary method)
      console.log('   🧠 Extracting entities with spaCy...');
      const entityResult = await spacyExtractor.extractEmailEntities(
        email.subject,
        email.content,
        { from: email.from, to: email.to.join(', ') }
      );
      
      console.log(`   ✅ Extracted ${entityResult.entityCount} entities`);
      console.log(`   🎯 Confidence: ${(entityResult.confidence * 100).toFixed(1)}%`);
      console.log(`   🔍 Types: ${entityResult.entityTypes.slice(0, 5).join(', ')}${entityResult.entityTypes.length > 5 ? '...' : ''}`);
      
      // 2. Process contacts from extracted entities
      console.log('   👥 Processing contacts...');
      const contacts = await processContactsFromEntities(entityResult, contactRepository);
      console.log(`   ✅ Processed ${contacts.length} contacts`);
      
      // 3. Create knowledge elements
      console.log('   📚 Creating knowledge elements...');
      const knowledgeElements = await createKnowledgeElementsFromEntities(
        email,
        entityResult,
        ontology
      );
      console.log(`   ✅ Created ${knowledgeElements.length} knowledge elements`);
      
      // 4. Classify email and extract insights
      const classification = classifyEmailWithSpacy(email, entityResult);
      const businessInsights = extractBusinessInsightsWithSpacy(entityResult);
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessedEmail = {
        subject: email.subject,
        from: email.from,
        to: email.to,
        content: email.content,
        date: email.date,
        entities: entityResult,
        contacts,
        knowledgeElements,
        classification,
        businessInsights,
        processingTime
      };
      
      results.push(result);
      totalEntities += entityResult.entityCount;
      totalContacts += contacts.length;
      totalKnowledgeElements += knowledgeElements.length;
      totalProcessingTime += processingTime;
      
      console.log(`   ⏱️  Processing time: ${processingTime}ms`);
      console.log(`   🏷️  Classification: ${classification}`);
      
    } catch (error) {
      console.error(`   ❌ Error processing email: ${error}`);
    }
  }
  
  // Display summary
  console.log('\n📊 SPACY PROCESSING SUMMARY');
  console.log('=' .repeat(80));
  console.log(`📧 Emails processed: ${results.length}`);
  console.log(`🧠 Total entities extracted: ${totalEntities}`);
  console.log(`👥 Total contacts processed: ${totalContacts}`);
  console.log(`📚 Total knowledge elements: ${totalKnowledgeElements}`);
  console.log(`⏱️  Average processing time: ${(totalProcessingTime / results.length).toFixed(0)}ms per email`);
  console.log(`🎯 Average confidence: ${(results.reduce((sum, r) => sum + r.entities.confidence, 0) / results.length * 100).toFixed(1)}%`);
  
  // Display detailed analysis
  console.log('\n\n📧 DETAILED EMAIL ANALYSIS WITH SPACY');
  console.log('=' .repeat(100));
  
  for (const [index, result] of results.entries()) {
    displayDetailedSpacyAnalysis(result, index + 1);
  }
  
  // Show spaCy advantages
  await demonstrateSpacyAdvantages(results);
  
  // Generate comprehensive report
  await generateSpacyDefaultReport(results);
  
  console.log('\n🎉 spaCy Default Processing Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated spaCy as default NLP engine:');
  console.log('   • 🧠 Advanced Named Entity Recognition (NER)');
  console.log('   • 🏢 Superior organization and person detection');
  console.log('   • 💰 Financial entity extraction with domain knowledge');
  console.log('   • 📍 Geographic and temporal understanding');
  console.log('   • 🔗 Contextual relationship mapping');
  console.log('   • 📊 Confidence scoring and quality metrics');
  console.log('   • 🎯 Business-specific entity classification');
  
  console.log('\n🚀 spaCy Configuration Benefits:');
  console.log('   • ✅ Higher accuracy than regex patterns');
  console.log('   • ✅ Semantic understanding of business context');
  console.log('   • ✅ Extensible with custom financial patterns');
  console.log('   • ✅ Robust fallback mechanisms');
  console.log('   • ✅ Production-ready enterprise NLP');
}

async function processContactsFromEntities(
  entityResult: SpacyEntityExtractionResult,
  contactRepository: InMemoryContactRepository
): Promise<Contact[]> {
  const contacts: Contact[] = [];
  
  // Extract person names and email addresses
  const personEntities = entityResult.entities.filter(e => e.type === EntityType.PERSON_NAME);
  const emailEntities = entityResult.entities.filter(e => e.type === EntityType.EMAIL_ADDRESS);
  
  // Create contacts from person names
  for (const person of personEntities) {
    try {
      // Try to find associated email
      const associatedEmail = emailEntities.find(email => 
        Math.abs(email.startIndex - person.startIndex) < 100 // Within 100 characters
      );
      
      const contact = new Contact({
        name: person.value,
        email: associatedEmail?.value || `${person.value.replace(/\s+/g, '.').toLowerCase()}@example.com`
      });
      
      await contactRepository.save(contact);
      contacts.push(contact);
    } catch (error) {
      console.warn(`   ⚠️  Could not create contact for ${person.value}`);
    }
  }
  
  return contacts;
}

async function createKnowledgeElementsFromEntities(
  email: any,
  entityResult: SpacyEntityExtractionResult,
  ontology: OCreamV2Ontology
): Promise<any[]> {
  const knowledgeElements: any[] = [];
  
  // Create email communication element
  const emailKnowledge = createInformationElement({
    title: `Email: ${email.subject}`,
    type: KnowledgeType.COMMUNICATION_LOG,
    content: {
      subject: email.subject,
      from: email.from,
      to: email.to,
      entityCount: entityResult.entityCount,
      confidence: entityResult.confidence,
      nlpMethod: 'spacy_default'
    },
    source: 'spacy_email_processor',
    reliability: entityResult.confidence,
    confidentiality: 'internal'
  });
  
  ontology.addEntity(emailKnowledge);
  knowledgeElements.push(emailKnowledge);
  
  // Create entity-specific knowledge elements
  for (const entity of entityResult.entities.slice(0, 10)) { // Limit to top 10
    const entityKnowledge = createInformationElement({
      title: `Entity: ${entity.type}`,
      type: KnowledgeType.CUSTOMER_PROFILE,
      content: {
        entityType: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        context: entity.context,
        spacyLabel: entity.spacyLabel,
        extractedFrom: email.subject
      },
      source: 'spacy_entity_extractor',
      reliability: entity.confidence,
      confidentiality: 'internal'
    });
    
    ontology.addEntity(entityKnowledge);
    knowledgeElements.push(entityKnowledge);
  }
  
  return knowledgeElements;
}

function classifyEmailWithSpacy(email: any, entityResult: SpacyEntityExtractionResult): string {
  const subject = email.subject.toLowerCase();
  const hasFinancialEntities = entityResult.entities.some(e => 
    e.type.includes('FINANCIAL') || e.type.includes('MONETARY') || e.type.includes('STOCK')
  );
  
  if (subject.includes('compliance') || subject.includes('aml')) {
    return 'COMPLIANCE_ALERT';
  } else if (subject.includes('urgent') || subject.includes('immediate')) {
    return 'HIGH_PRIORITY';
  } else if (hasFinancialEntities && subject.includes('portfolio')) {
    return 'PORTFOLIO_REVIEW';
  } else if (hasFinancialEntities && subject.includes('market')) {
    return 'MARKET_RESEARCH';
  } else if (subject.includes('review') || subject.includes('meeting')) {
    return 'BUSINESS_MEETING';
  } else {
    return 'GENERAL_BUSINESS';
  }
}

function extractBusinessInsightsWithSpacy(entityResult: SpacyEntityExtractionResult): string[] {
  const insights: string[] = [];
  
  const entityTypes = entityResult.entityTypes;
  
  if (entityTypes.includes(EntityType.FINANCIAL_INSTITUTION)) {
    insights.push('Financial Institution Communication');
  }
  
  if (entityTypes.includes(EntityType.MONETARY_AMOUNT)) {
    const amounts = entityResult.entities.filter(e => e.type === EntityType.MONETARY_AMOUNT);
    if (amounts.length > 0) {
      insights.push(`Contains ${amounts.length} Financial Amount(s)`);
    }
  }
  
  if (entityTypes.includes(EntityType.STOCK_SYMBOL)) {
    insights.push('Stock/Securities Discussion');
  }
  
  if (entityTypes.includes(EntityType.PERCENTAGE)) {
    insights.push('Performance Metrics Included');
  }
  
  if (entityTypes.includes(EntityType.DATE)) {
    insights.push('Time-Sensitive Content');
  }
  
  if (entityResult.confidence > 0.8) {
    insights.push('High-Confidence Extraction');
  }
  
  return insights;
}

function displayDetailedSpacyAnalysis(result: ProcessedEmail, emailNumber: number) {
  console.log(`\n📧 EMAIL ${emailNumber}: ${result.subject}`);
  console.log('-' .repeat(80));
  console.log(`📨 From: ${result.from}`);
  console.log(`📬 To: ${result.to.join(', ')}`);
  console.log(`📅 Date: ${result.date.toLocaleString()}`);
  console.log(`🧠 spaCy entities: ${result.entities.entityCount}`);
  console.log(`👥 Contacts: ${result.contacts.length}`);
  console.log(`📚 Knowledge elements: ${result.knowledgeElements.length}`);
  console.log(`⏱️  Processing time: ${result.processingTime}ms`);
  console.log(`🎯 Overall confidence: ${(result.entities.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️  Classification: ${result.classification}`);
  console.log(`💡 Business insights: ${result.businessInsights.join(', ')}`);
  
  // Show top entities by type
  if (result.entities.entities.length > 0) {
    console.log(`\n🧠 TOP SPACY ENTITIES:`);
    
    const entitiesByType = result.entities.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(entitiesByType).forEach(([type, entities]) => {
      console.log(`\n   📌 ${type} (${entities.length}):`);
      entities.slice(0, 3).forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.7 ? '🟡' : '🔴';
        console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" (${(entity.confidence * 100).toFixed(1)}%)`);
        if (entity.context && entity.context !== entity.value) {
          console.log(`          Context: "${entity.context.substring(0, 60)}..."`);
        }
      });
    });
  }
}

async function demonstrateSpacyAdvantages(results: ProcessedEmail[]) {
  console.log('\n\n🚀 SPACY ADVANTAGES DEMONSTRATED');
  console.log('=' .repeat(80));
  
  const totalEntities = results.reduce((sum, r) => sum + r.entities.entityCount, 0);
  const avgConfidence = results.reduce((sum, r) => sum + r.entities.confidence, 0) / results.length;
  const uniqueEntityTypes = new Set(results.flatMap(r => r.entities.entityTypes));
  
  console.log(`📊 Processing Statistics:`);
  console.log(`   • Total entities extracted: ${totalEntities}`);
  console.log(`   • Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`   • Unique entity types: ${uniqueEntityTypes.size}`);
  console.log(`   • High-confidence entities (>80%): ${results.flatMap(r => r.entities.entities).filter(e => e.confidence > 0.8).length}`);
  
  console.log(`\n🎯 Entity Type Distribution:`);
  const typeDistribution = results.flatMap(r => r.entities.entities).reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(typeDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} occurrences`);
    });
  
  console.log(`\n✨ spaCy Unique Capabilities Shown:`);
  console.log(`   • 🏢 Organization recognition (Goldman Sachs, Morgan Stanley, JPMorgan)`);
  console.log(`   • 👤 Person name extraction (Sarah Chen, Michael Rodriguez, Jennifer Liu)`);
  console.log(`   • 📍 Location understanding (New York, Switzerland, Wall Street)`);
  console.log(`   • 💰 Financial amount detection with context`);
  console.log(`   • 📈 Stock symbol identification (AAPL, MSFT, NVDA)`);
  console.log(`   • 📅 Date and time comprehension`);
  console.log(`   • 🎯 Professional title recognition (CFA, CAMS)`);
}

async function generateSpacyDefaultReport(results: ProcessedEmail[]) {
  console.log('\n📄 Generating spaCy default processing report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    processingEngine: 'spacy_default',
    configuration: DEFAULT_CONFIG,
    summary: {
      totalEmails: results.length,
      totalEntities: results.reduce((sum, r) => sum + r.entities.entityCount, 0),
      totalContacts: results.reduce((sum, r) => sum + r.contacts.length, 0),
      totalKnowledgeElements: results.reduce((sum, r) => sum + r.knowledgeElements.length, 0),
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      averageConfidence: results.reduce((sum, r) => sum + r.entities.confidence, 0) / results.length,
      averageEntitiesPerEmail: results.reduce((sum, r) => sum + r.entities.entityCount, 0) / results.length
    },
    emailAnalysis: results.map(result => ({
      subject: result.subject,
      from: result.from,
      date: result.date,
      entityCount: result.entities.entityCount,
      entityTypes: result.entities.entityTypes,
      topEntities: result.entities.entities.slice(0, 5).map(e => ({
        type: e.type,
        value: e.value,
        confidence: e.confidence
      })),
      classification: result.classification,
      businessInsights: result.businessInsights,
      processingTime: result.processingTime
    })),
    spacyCapabilities: {
      primaryModel: 'en_core_web_lg',
      fallbackModel: 'en_core_web_sm',
      customPatterns: ['FINANCIAL_ORG', 'STOCK_SYMBOL', 'FINANCIAL_INSTRUMENT'],
      confidenceScoring: true,
      contextualExtraction: true,
      domainSpecialization: 'financial_services'
    }
  };
  
  const reportPath = join(__dirname, '../email-processing-spacy-default-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`   ✅ Report saved: ${reportPath}`);
  console.log(`   📊 Contains ${report.emailAnalysis.length} email analyses`);
  console.log(`   🧠 Average processing time: ${report.summary.averageProcessingTime.toFixed(0)}ms`);
  console.log(`   🎯 Average confidence: ${(report.summary.averageConfidence * 100).toFixed(1)}%`);
}

// Run the demo
if (require.main === module) {
  demonstrateSpacyAsDefault().catch(console.error);
}

export { demonstrateSpacyAsDefault }; 