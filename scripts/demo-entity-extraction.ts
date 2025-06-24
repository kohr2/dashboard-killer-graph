// Entity Extraction Demo - Shows how entities are extracted from emails
// Demonstrates the comprehensive entity extraction capabilities

import { EntityExtractionService, EntityType, ExtractedEntity } from '../src/crm-core/application/services/entity-extraction.service';

// Sample email content for testing
const sampleEmails = [
  {
    subject: "Urgent: Project Phoenix Proposal - Budget $50,000",
    body: `Hi John,

I hope this email finds you well. We have an urgent proposal for Project Phoenix that needs discussion. 
Our team is very excited about the potential collaboration and would like to schedule a meeting next week 
to discuss the project details and budget.

The project involves implementing a new CRM system with advanced analytics capabilities.
We're looking at a budget of $50,000 and a timeline of 3 months.

Key details:
- Project Manager: Sarah Johnson
- Technical Lead: Mike Chen  
- Budget: $50,000 USD
- Timeline: 3 months (January 15, 2024 - April 15, 2024)
- Deadline: March 1, 2024
- Contract #: CTR-2024-001

Please contact me at sarah.johnson@acme.com or call me at +1-555-123-4567 if you have any questions.
You can also reach our office at 123 Main Street, San Francisco, CA 94105.

The proposal document is available at: https://docs.acme.com/proposals/phoenix-2024
Our website: www.acme.com

Best regards,
Sarah Johnson
Project Manager
ACME Corporation
sarah.johnson@acme.com
+1-555-123-4567`,
    from: "sarah.johnson@acme.com"
  },
  {
    subject: "Invoice INV-2024-001 - Payment Due $2,500.00",
    body: `Dear Billing Department,

This is a reminder that Invoice #INV-2024-001 for $2,500.00 is now due.
The invoice was issued on January 1st, 2024 with payment terms of Net 30.

Invoice Details:
- Invoice Number: INV-2024-001
- Amount: $2,500.00
- Due Date: January 31, 2024
- Account Number: ACC-789456
- Reference: REF-2024-Q1-001

Please process payment at your earliest convenience to avoid any late fees of 1.5% per month.

If you have any questions about this invoice, please contact our accounts team at:
- Email: accounts@vendor.com
- Phone: (555) 987-6543
- Address: 456 Business Ave, Suite 200, New York, NY 10001

Payment can be made online at https://payments.vendor.com or by check.

Thank you,
Accounts Receivable Team
Vendor Solutions Inc.
accounts@vendor.com
(555) 987-6543`,
    from: "accounts@vendor.com"
  },
  {
    subject: "Meeting Scheduled: Technical Review - Jan 25, 2024 at 2:00 PM",
    body: `Hello Team,

I've scheduled a technical review meeting for our Q1 initiatives.

Meeting Details:
- Date: January 25, 2024
- Time: 2:00 PM - 4:00 PM PST
- Location: Conference Room B, 15th Floor
- Meeting ID: MEET-2024-001
- Zoom Link: https://zoom.us/j/123456789

Attendees:
- David Miller (Technical Director)
- Lisa Wong (Senior Developer)  
- Robert Taylor (QA Manager)
- Jennifer Adams (Product Manager)

Agenda:
1. Project Alpha status (30 minutes)
2. Budget review - current spend: $25,000 of $75,000 allocated
3. Timeline adjustments
4. Risk assessment

Please review the technical documentation at https://docs.company.com/tech-review-q1
and prepare your status reports.

If you can't attend, please send your updates to david.miller@company.com by 1:00 PM.

Best regards,
David Miller
Technical Director
Company Tech Solutions
david.miller@company.com
Direct: (555) 444-3333
Mobile: (555) 444-3334`,
    from: "david.miller@company.com"
  }
];

async function demonstrateEntityExtraction() {
  console.log('🔍 Starting Entity Extraction Demo');
  console.log('=' .repeat(70));

  const entityService = new EntityExtractionService();

  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 Email ${index + 1}: ${email.subject}`);
    console.log('-'.repeat(70));

    // Extract entities from email
    const result = entityService.extractEmailEntities(email.subject, email.body);

    console.log(`\n📊 Extraction Results:`);
    console.log(`   ⏱️  Processing Time: ${result.processingTime}ms`);
    console.log(`   🎯 Entities Found: ${result.entityCount}`);
    console.log(`   📈 Overall Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   🔤 Text Length: ${result.metadata.textLength} characters`);
    console.log(`   🛠️  Method: ${result.metadata.extractionMethod}`);

    // Group entities by type
    const entitiesByType = result.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, ExtractedEntity[]>);

    console.log(`\n🏷️  Entities by Type:`);
    for (const [type, entities] of Object.entries(entitiesByType)) {
      console.log(`\n   📋 ${type} (${entities.length} found):`);
      
      entities.forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.5 ? '🟡' : '🔴';
        console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" (${(entity.confidence * 100).toFixed(1)}%)`);
        
        if (entity.context && entity.context.length > 0) {
          const contextPreview = entity.context.length > 100 
            ? entity.context.substring(0, 100) + '...'
            : entity.context;
          console.log(`         Context: "${contextPreview}"`);
        }
        
        if (entity.metadata) {
          const metadataInfo = [];
          if (entity.metadata.source) metadataInfo.push(`Source: ${entity.metadata.source}`);
          if (entity.metadata.patternType) metadataInfo.push(`Pattern: ${entity.metadata.patternType}`);
          if (entity.metadata.category) metadataInfo.push(`Category: ${entity.metadata.category}`);
          
          if (metadataInfo.length > 0) {
            console.log(`         Metadata: ${metadataInfo.join(', ')}`);
          }
        }
      });
    }

    // Show entity statistics
    const stats = entityService.getEntityStatistics(result.entities);
    console.log(`\n📈 Statistics:`);
    console.log(`   🟢 High Confidence (>80%): ${stats.highConfidenceEntities}`);
    console.log(`   🟡 Medium Confidence (50-80%): ${stats.mediumConfidenceEntities}`);
    console.log(`   🔴 Low Confidence (<50%): ${stats.lowConfidenceEntities}`);
    console.log(`   📊 Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);

    // Show specific entity type insights
    console.log(`\n🔍 Entity Type Analysis:`);
    const typeStats = stats.entityTypeDistribution;
    
    if (typeStats[EntityType.EMAIL_ADDRESS]) {
      console.log(`   📧 Email Addresses: ${typeStats[EntityType.EMAIL_ADDRESS]} (Contact information)`);
    }
    if (typeStats[EntityType.PHONE_NUMBER]) {
      console.log(`   📞 Phone Numbers: ${typeStats[EntityType.PHONE_NUMBER]} (Contact information)`);
    }
    if (typeStats[EntityType.PERSON_NAME]) {
      console.log(`   👤 Person Names: ${typeStats[EntityType.PERSON_NAME]} (Key contacts identified)`);
    }
    if (typeStats[EntityType.MONETARY_AMOUNT]) {
      console.log(`   💰 Monetary Amounts: ${typeStats[EntityType.MONETARY_AMOUNT]} (Financial data)`);
    }
    if (typeStats[EntityType.DATE]) {
      console.log(`   📅 Dates: ${typeStats[EntityType.DATE]} (Temporal information)`);
    }
    if (typeStats[EntityType.URL]) {
      console.log(`   🔗 URLs: ${typeStats[EntityType.URL]} (Digital resources)`);
    }
    if (typeStats[EntityType.ADDRESS]) {
      console.log(`   🏢 Addresses: ${typeStats[EntityType.ADDRESS]} (Location information)`);
    }

    // Show business intelligence insights
    console.log(`\n🧠 Business Intelligence Insights:`);
    
    const businessEntities = result.entities.filter(e => 
      [EntityType.MONETARY_AMOUNT, EntityType.CONTRACT_NUMBER, EntityType.INVOICE_NUMBER, 
       EntityType.PROJECT_NAME, EntityType.REFERENCE_NUMBER].includes(e.type)
    );
    
    if (businessEntities.length > 0) {
      console.log(`   💼 Business-critical entities detected: ${businessEntities.length}`);
      
      const amounts = result.entities.filter(e => e.type === EntityType.MONETARY_AMOUNT);
      if (amounts.length > 0) {
        console.log(`   💵 Financial values mentioned: ${amounts.map(a => a.value).join(', ')}`);
      }
      
      const contracts = result.entities.filter(e => 
        [EntityType.CONTRACT_NUMBER, EntityType.INVOICE_NUMBER, EntityType.REFERENCE_NUMBER].includes(e.type)
      );
      if (contracts.length > 0) {
        console.log(`   📄 Document references: ${contracts.map(c => c.value).join(', ')}`);
      }
    }

    const contacts = result.entities.filter(e => 
      [EntityType.EMAIL_ADDRESS, EntityType.PHONE_NUMBER, EntityType.PERSON_NAME].includes(e.type)
    );
    if (contacts.length > 0) {
      console.log(`   👥 Contact information entities: ${contacts.length}`);
    }

    const temporal = result.entities.filter(e => 
      [EntityType.DATE, EntityType.TIME, EntityType.DEADLINE].includes(e.type)
    );
    if (temporal.length > 0) {
      console.log(`   ⏰ Time-sensitive information: ${temporal.length} items`);
    }
  }

  // Overall summary
  console.log('\n🎯 Overall Entity Extraction Summary');
  console.log('=' .repeat(70));
  
  let totalEntities = 0;
  let totalProcessingTime = 0;
  const allEntityTypes = new Set<string>();
  
  for (const email of sampleEmails) {
    const result = entityService.extractEmailEntities(email.subject, email.body);
    totalEntities += result.entityCount;
    totalProcessingTime += result.processingTime;
    result.entityTypes.forEach(type => allEntityTypes.add(type));
  }

  console.log(`📊 Total emails processed: ${sampleEmails.length}`);
  console.log(`🎯 Total entities extracted: ${totalEntities}`);
  console.log(`⏱️  Total processing time: ${totalProcessingTime}ms`);
  console.log(`📈 Average entities per email: ${(totalEntities / sampleEmails.length).toFixed(1)}`);
  console.log(`🏷️  Unique entity types found: ${allEntityTypes.size}`);
  console.log(`⚡ Average processing speed: ${(totalProcessingTime / sampleEmails.length).toFixed(1)}ms per email`);

  console.log('\n🔧 Entity Types Detected:');
  Array.from(allEntityTypes).sort().forEach(type => {
    console.log(`   • ${type}`);
  });

  console.log('\n🚀 Entity Extraction Capabilities:');
  console.log('   ✅ Pattern-based extraction with regex');
  console.log('   ✅ Context-aware confidence scoring');
  console.log('   ✅ Email-specific entity detection');
  console.log('   ✅ Signature and metadata extraction');
  console.log('   ✅ Duplicate and overlap removal');
  console.log('   ✅ Business intelligence insights');
  console.log('   ✅ Multi-type entity support (25+ types)');
  console.log('   ✅ Confidence-based filtering');

  console.log('\n🎉 Entity Extraction Demo Completed!');
  console.log('=' .repeat(70));
}

// Run the demo
if (require.main === module) {
  demonstrateEntityExtraction().catch(console.error);
}

export { demonstrateEntityExtraction }; 