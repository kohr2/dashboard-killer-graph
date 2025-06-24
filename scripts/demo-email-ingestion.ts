// Email Ingestion Demo - O-CREAM-v2 Integration
// Demonstrates how emails are ingested into the ontological knowledge system

import { EmailIngestionService, IncomingEmail } from '../src/crm-core/application/services/email-ingestion.service';
import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { InMemoryCommunicationRepository } from '../src/crm-core/infrastructure/repositories/in-memory-communication-repository';
import { oCreamV2, DOLCECategory, KnowledgeType, ActivityType } from '../src/crm-core/domain/ontology/o-cream-v2';

async function demonstrateEmailIngestion() {
  console.log('🚀 Starting Email Ingestion Demo with O-CREAM-v2');
  console.log('=' .repeat(60));

  // Initialize repositories and service
  const contactRepo = new InMemoryContactRepository();
  const communicationRepo = new InMemoryCommunicationRepository();
  const emailService = new EmailIngestionService(contactRepo, communicationRepo);

  // Sample incoming emails
  const sampleEmails: IncomingEmail[] = [
    {
      messageId: 'msg-001@example.com',
      from: 'john.doe@acme.com',
      to: ['sales@ourcompany.com'],
      cc: ['manager@ourcompany.com'],
      subject: 'Urgent: Project Proposal Discussion',
      body: `Hi there,

I hope this email finds you well. We have an urgent proposal that needs discussion. 
Our team is very excited about the potential collaboration and would like to schedule 
a meeting next week to discuss the project details and budget.

The project involves implementing a new CRM system with advanced analytics capabilities.
We're looking at a budget of $50,000 and a timeline of 3 months.

Please let me know your availability for a meeting.

Best regards,
John Doe
Project Manager
john.doe@acme.com
+1-555-123-4567`,
      htmlBody: '<p>Hi there...</p>',
      attachments: [
        {
          filename: 'project_proposal.pdf',
          contentType: 'application/pdf',
          size: 245760
        },
        {
          filename: 'budget_breakdown.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 45120
        }
      ],
      receivedAt: new Date('2024-01-15T10:30:00Z'),
      headers: {
        'Message-ID': 'msg-001@example.com',
        'From': 'john.doe@acme.com',
        'To': 'sales@ourcompany.com',
        'Subject': 'Urgent: Project Proposal Discussion',
        'Date': 'Mon, 15 Jan 2024 10:30:00 +0000'
      },
      threadId: 'thread-001',
      references: []
    },
    {
      messageId: 'msg-002@support.com',
      from: 'sarah.smith@techcorp.com',
      to: ['support@ourcompany.com'],
      subject: 'Thank you for the excellent service',
      body: `Dear Support Team,

I wanted to take a moment to thank you for the excellent service you provided last week.
The issue with our integration was resolved quickly and professionally.

Your team's expertise and responsiveness was greatly appreciated. We're very pleased
with the outcome and look forward to continuing our partnership.

Best regards,
Sarah Smith
Technical Director
sarah.smith@techcorp.com`,
      receivedAt: new Date('2024-01-15T14:45:00Z'),
      headers: {
        'Message-ID': 'msg-002@support.com',
        'From': 'sarah.smith@techcorp.com',
        'To': 'support@ourcompany.com',
        'Subject': 'Thank you for the excellent service'
      },
      threadId: 'thread-002'
    },
    {
      messageId: 'msg-003@billing.com',
      from: 'accounts@vendor.com',
      to: ['billing@ourcompany.com'],
      subject: 'Invoice #INV-2024-001 - Payment Due',
      body: `Dear Billing Department,

This is a reminder that Invoice #INV-2024-001 for $2,500.00 is now due.
The invoice was issued on January 1st, 2024 with payment terms of Net 30.

Please process payment at your earliest convenience to avoid any late fees.

If you have any questions about this invoice, please contact our accounts team.

Thank you,
Accounts Receivable Team
accounts@vendor.com`,
      receivedAt: new Date('2024-01-15T16:20:00Z'),
      headers: {
        'Message-ID': 'msg-003@billing.com',
        'From': 'accounts@vendor.com',
        'To': 'billing@ourcompany.com',
        'Subject': 'Invoice #INV-2024-001 - Payment Due'
      }
    }
  ];

  // Process each email
  for (const [index, email] of sampleEmails.entries()) {
    console.log(`\n📧 Processing Email ${index + 1}: ${email.subject}`);
    console.log('-'.repeat(50));

    const result = await emailService.ingestEmail(email);

    if (result.success) {
      console.log(`✅ Email ingested successfully!`);
      console.log(`   📝 Communication ID: ${result.communicationId}`);
      console.log(`   👥 Contacts processed: ${result.contactsProcessed}`);
      console.log(`   🧠 Knowledge elements created: ${result.knowledgeElementsCreated}`);
      console.log(`   ⚡ Activities created: ${result.activitiesCreated}`);
      console.log(`   🏷️  Classification: ${result.ontologyInsights.emailClassification}`);
      console.log(`   😊 Sentiment: ${result.ontologyInsights.sentiment}`);
      console.log(`   🔥 Priority: ${result.ontologyInsights.priority}`);
      console.log(`   📋 Topics: ${result.ontologyInsights.topics.join(', ') || 'None detected'}`);
      console.log(`   🎯 Entities: ${result.ontologyInsights.entities.length} extracted`);
    } else {
      console.log(`❌ Email ingestion failed: ${result.message}`);
    }
  }

  // Show ontology statistics
  console.log('\n📊 O-CREAM-v2 Ontology Statistics');
  console.log('=' .repeat(60));
  
  const ontologyData = oCreamV2.exportOntology();
  console.log(`📈 Total entities: ${ontologyData.entityCount}`);
  console.log(`🔗 Total relationships: ${ontologyData.relationshipCount}`);
  
  console.log('\n📋 Entity Distribution:');
  Object.entries(ontologyData.typeDistribution).forEach(([type, count]) => {
    if (typeof count === 'number' && count > 0) {
      console.log(`   ${type}: ${count}`);
    }
  });

  // Show knowledge elements by type
  console.log('\n🧠 Knowledge Elements Analysis:');
  const knowledgeElements = Object.values(DOLCECategory).flatMap(category => 
    oCreamV2.getEntitiesByType(category)
  ).filter(entity => Object.values(KnowledgeType).includes((entity as any).type));

  const knowledgeByType = knowledgeElements.reduce((acc, ke: any) => {
    acc[ke.type] = (acc[ke.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(knowledgeByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  // Show activities by type
  console.log('\n⚡ Activities Analysis:');
  const activities = Object.values(DOLCECategory).flatMap(category => 
    oCreamV2.getEntitiesByType(category)
  ).filter(entity => Object.values(ActivityType).includes((entity as any).type));

  const activitiesByType = activities.reduce((acc, activity: any) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(activitiesByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  // Show sample knowledge element details
  console.log('\n🔍 Sample Knowledge Element Details:');
  const sampleKE = knowledgeElements.find((ke: any) => ke.type === KnowledgeType.COMMUNICATION_LOG);
  if (sampleKE) {
    console.log(`   ID: ${sampleKE.id}`);
    console.log(`   Type: ${(sampleKE as any).type}`);
    console.log(`   Title: ${(sampleKE as any).title}`);
    console.log(`   Reliability: ${(sampleKE as any).reliability}`);
    console.log(`   Confidentiality: ${(sampleKE as any).confidentiality}`);
    console.log(`   Related Entities: ${(sampleKE as any).relatedEntities.length}`);
  }

  console.log('\n🎉 Email Ingestion Demo Completed!');
  console.log('=' .repeat(60));
}

// Run the demo
if (require.main === module) {
  demonstrateEmailIngestion().catch(console.error);
}

export { demonstrateEmailIngestion }; 