// Email Ingestion Service - Application Layer
// Service for ingesting emails into the O-CREAM-v2 ontological system

import { ContactRepository } from '../../domain/repositories/contact-repository';
import { CommunicationRepository } from '../../domain/repositories/communication-repository';
import { Communication } from '../../domain/entities/communication';
import { OCreamContactEntity } from '../../domain/entities/contact-ontology';
import { oCreamV2, DOLCECategory, KnowledgeType, ActivityType, createInformationElement } from '../../domain/ontology/o-cream-v2';

export interface IncomingEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
  }>;
  receivedAt: Date;
  headers: Record<string, string>;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface EmailIngestionResult {
  success: boolean;
  message: string;
  communicationId?: string;
  contactsProcessed: number;
  knowledgeElementsCreated: number;
  activitiesCreated: number;
  ontologyInsights: {
    emailClassification: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics: string[];
    entities: string[];
    priority: 'low' | 'medium' | 'high';
  };
}

export class EmailIngestionService {
  constructor(
    private contactRepository: ContactRepository,
    private communicationRepository: CommunicationRepository
  ) {}

  async ingestEmail(email: IncomingEmail): Promise<EmailIngestionResult> {
    try {
      console.log(`📧 Starting email ingestion: ${email.subject} from ${email.from}`);

      // Step 1: Find or create contact for sender
      const senderContact = await this.findOrCreateContact(email.from);
      
      // Step 2: Process recipients
      const recipientContacts = await Promise.all([
        ...email.to.map(addr => this.findOrCreateContact(addr)),
        ...(email.cc || []).map(addr => this.findOrCreateContact(addr))
      ]);

      // Step 3: Create communication record
      const communication = await this.createCommunicationRecord(email, senderContact.getId());

      // Step 4: Perform email analysis
      const analysis = this.analyzeEmail(email);

      // Step 5: Create ontological knowledge elements
      const knowledgeElements = await this.createEmailKnowledgeElements(
        email, 
        communication, 
        senderContact, 
        analysis
      );

      // Step 6: Create activities
      const activities = await this.createEmailActivities(
        email, 
        communication, 
        senderContact, 
        recipientContacts
      );

      // Step 7: Update contact relationships
      await this.updateContactRelationships(senderContact, recipientContacts);

      // Step 8: Store in knowledge graph
      await this.storeInKnowledgeGraph(email, communication, knowledgeElements);

      return {
        success: true,
        message: 'Email successfully ingested into ontology',
        communicationId: communication.getId(),
        contactsProcessed: recipientContacts.length + 1,
        knowledgeElementsCreated: knowledgeElements.length,
        activitiesCreated: activities.length,
        ontologyInsights: analysis
      };

    } catch (error) {
      console.error('❌ Email ingestion failed:', error);
      return {
        success: false,
        message: `Email ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        contactsProcessed: 0,
        knowledgeElementsCreated: 0,
        activitiesCreated: 0,
        ontologyInsights: {
          emailClassification: 'error',
          topics: [],
          entities: [],
          priority: 'low'
        }
      };
    }
  }

  private async findOrCreateContact(emailAddress: string): Promise<any> {
    // Try to find existing contact by email
    let contact = await this.contactRepository.findByEmail(emailAddress);
    
    if (!contact) {
      // Extract name from email if possible
      const namePart = emailAddress.split('@')[0];
      const [firstName, ...lastNameParts] = namePart.split(/[._-]/);
      const lastName = lastNameParts.join(' ') || 'Unknown';

      // Create new contact
      contact = new (require('../../domain/entities/contact').Contact)({
        name: `${firstName} ${lastName}`,
        email: emailAddress
      });

      contact = await this.contactRepository.save(contact);
      console.log(`👤 Created new contact: ${emailAddress}`);
    }

    return contact;
  }

  private async createCommunicationRecord(email: IncomingEmail, contactId: string): Promise<Communication> {
    const communication = new Communication({
      type: 'email',
      subject: email.subject,
      content: email.body,
      direction: 'inbound',
      contactId: contactId
    });

    const savedCommunication = await this.communicationRepository.save(communication);
    console.log(`📝 Created communication record: ${savedCommunication.getId()}`);
    
    return savedCommunication;
  }

  private analyzeEmail(email: IncomingEmail): EmailIngestionResult['ontologyInsights'] {
    // Simple email analysis (in production, you'd use NLP services)
    const content = (email.subject + ' ' + email.body).toLowerCase();
    
    // Classify email type
    let classification = 'general';
    if (content.includes('meeting') || content.includes('schedule')) {
      classification = 'meeting_request';
    } else if (content.includes('proposal') || content.includes('quote')) {
      classification = 'business_proposal';
    } else if (content.includes('support') || content.includes('help')) {
      classification = 'support_request';
    } else if (content.includes('invoice') || content.includes('payment')) {
      classification = 'financial';
    }

    // Extract topics (simple keyword extraction)
    const topics: string[] = [];
    const topicKeywords = ['project', 'meeting', 'deadline', 'budget', 'proposal', 'contract'];
    topicKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        topics.push(keyword);
      }
    });

    // Extract entities (simple pattern matching)
    const entities: string[] = [];
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /\b\d{3}-\d{3}-\d{4}\b/g;
    
    const emailMatches = email.body.match(emailPattern) || [];
    const phoneMatches = email.body.match(phonePattern) || [];
    
    entities.push(...emailMatches, ...phoneMatches);

    // Determine priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (content.includes('urgent') || content.includes('asap') || email.subject.includes('!')) {
      priority = 'high';
    } else if (content.includes('fyi') || content.includes('optional')) {
      priority = 'low';
    }

    // Simple sentiment analysis
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const positiveWords = ['thank', 'great', 'excellent', 'pleased', 'happy'];
    const negativeWords = ['problem', 'issue', 'concern', 'disappointed', 'urgent'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    return {
      emailClassification: classification,
      sentiment,
      topics,
      entities,
      priority
    };
  }

  private async createEmailKnowledgeElements(
    email: IncomingEmail,
    communication: Communication,
    senderContact: any,
    analysis: EmailIngestionResult['ontologyInsights']
  ): Promise<any[]> {
    const knowledgeElements: any[] = [];

    // 1. Communication Log Knowledge Element
    const commLogKE = createInformationElement({
      title: `Email Communication: ${email.subject}`,
      type: KnowledgeType.COMMUNICATION_LOG,
      content: {
        messageId: email.messageId,
        communicationId: communication.getId(),
        subject: email.subject,
        body: email.body,
        from: email.from,
        to: email.to,
        cc: email.cc,
        receivedAt: email.receivedAt,
        classification: analysis.emailClassification,
        sentiment: analysis.sentiment,
        priority: analysis.priority,
        threadId: email.threadId,
        inReplyTo: email.inReplyTo
      },
      format: 'json',
      source: 'Email System',
      reliability: 0.95,
      confidentiality: 'internal',
      relatedEntities: [senderContact.getId(), communication.getId()],
      metadata: {
        emailProvider: this.extractEmailProvider(email.from),
        hasAttachments: (email.attachments?.length || 0) > 0,
        threadLength: email.references?.length || 0
      }
    });

    oCreamV2.addEntity(commLogKE);
    knowledgeElements.push(commLogKE);

    // 2. Customer Interaction History
    const interactionKE = createInformationElement({
      title: `Customer Interaction: ${email.from}`,
      type: KnowledgeType.INTERACTION_HISTORY,
      content: {
        contactId: senderContact.getId(),
        interactionType: 'email',
        timestamp: email.receivedAt,
        summary: email.subject,
        sentiment: analysis.sentiment,
        topics: analysis.topics,
        outcome: 'received',
        followUpRequired: analysis.priority === 'high'
      },
      format: 'json',
      source: 'Email System',
      reliability: 0.9,
      confidentiality: 'internal',
      relatedEntities: [senderContact.getId()],
      metadata: {
        automaticallyGenerated: true,
        extractedEntities: analysis.entities
      }
    });

    oCreamV2.addEntity(interactionKE);
    knowledgeElements.push(interactionKE);

    // 3. If email contains business content, create business knowledge
    if (analysis.emailClassification === 'business_proposal' || analysis.emailClassification === 'financial') {
      const businessKE = createInformationElement({
        title: `Business Communication: ${email.subject}`,
        type: KnowledgeType.TRANSACTION_DATA,
        content: {
          communicationType: analysis.emailClassification,
          businessContext: analysis.topics,
          extractedEntities: analysis.entities,
          priority: analysis.priority,
          requiresAction: analysis.priority === 'high',
          relatedCommunication: communication.getId()
        },
        format: 'json',
        source: 'Email Analysis',
        reliability: 0.8,
        confidentiality: 'confidential',
        relatedEntities: [senderContact.getId()],
        metadata: {
          analysisVersion: '1.0',
          extractionMethod: 'keyword_pattern'
        }
      });

      oCreamV2.addEntity(businessKE);
      knowledgeElements.push(businessKE);
    }

    // 4. Process attachments if any
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        const attachmentKE = createInformationElement({
          title: `Email Attachment: ${attachment.filename}`,
          type: KnowledgeType.DOCUMENT_MANAGEMENT,
          content: {
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            emailMessageId: email.messageId,
            communicationId: communication.getId(),
            extractedAt: new Date()
          },
          format: 'binary',
          source: 'Email Attachment',
          reliability: 1.0,
          confidentiality: 'confidential',
          relatedEntities: [senderContact.getId(), communication.getId()],
          metadata: {
            fileExtension: attachment.filename.split('.').pop(),
            isDocument: this.isDocumentFile(attachment.filename),
            requiresProcessing: this.requiresProcessing(attachment.contentType)
          }
        });

        oCreamV2.addEntity(attachmentKE);
        knowledgeElements.push(attachmentKE);
      }
    }

    console.log(`🧠 Created ${knowledgeElements.length} knowledge elements`);
    return knowledgeElements;
  }

  private async createEmailActivities(
    email: IncomingEmail,
    communication: Communication,
    senderContact: any,
    recipientContacts: any[]
  ): Promise<any[]> {
    const activities: any[] = [];

    // 1. Email Reception Activity
    const receptionActivity = {
      id: this.generateId(),
      category: DOLCECategory.PERDURANT,
      type: ActivityType.DATA_COLLECTION,
      name: 'Email Received',
      description: `Email received from ${email.from}: ${email.subject}`,
      participants: [senderContact.getId(), ...recipientContacts.map(c => c.getId())],
      startTime: email.receivedAt,
      endTime: email.receivedAt,
      status: 'completed' as const,
      success: true,
      context: {
        emailMessageId: email.messageId,
        communicationId: communication.getId(),
        emailProvider: this.extractEmailProvider(email.from),
        hasAttachments: (email.attachments?.length || 0) > 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    oCreamV2.addEntity(receptionActivity);
    activities.push(receptionActivity);

    // 2. Customer Communication Activity
    const communicationActivity = {
      id: this.generateId(),
      category: DOLCECategory.PERDURANT,
      type: ActivityType.CUSTOMER_SUPPORT,
      name: 'Customer Email Communication',
      description: `Email communication with ${email.from}`,
      participants: [senderContact.getId()],
      startTime: email.receivedAt,
      endTime: email.receivedAt,
      status: 'completed' as const,
      success: true,
      outcome: `Email received: ${email.subject}`,
      context: {
        communicationType: 'email',
        direction: 'inbound',
        subject: email.subject,
        priority: this.analyzeEmail(email).priority
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    oCreamV2.addEntity(communicationActivity);
    activities.push(communicationActivity);

    // 3. Add activities to contact's activity history
    const oCreamContact = oCreamV2.getEntity(senderContact.getId()) as OCreamContactEntity;
    if (oCreamContact) {
      oCreamContact.addActivity(receptionActivity.id);
      oCreamContact.addActivity(communicationActivity.id);
      oCreamContact.addCommunicationActivity(communication.getId());
    }

    console.log(`⚡ Created ${activities.length} activities`);
    return activities;
  }

  private async updateContactRelationships(senderContact: any, recipientContacts: any[]): Promise<void> {
    // Create communication relationships between sender and recipients
    for (const recipient of recipientContacts) {
      if (recipient.getId() !== senderContact.getId()) {
        const relationship = {
          id: this.generateId(),
          relationshipType: 'COMMUNICATION',
          sourceEntityId: senderContact.getId(),
          targetEntityId: recipient.getId(),
          sourceRole: 'sender',
          targetRole: 'recipient',
          temporal: {
            startTime: new Date()
          },
          properties: {
            communicationType: 'email',
            frequency: 'occasional'
          },
          context: 'email_communication',
          strength: 0.5,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        oCreamV2.addRelationship(relationship);
        
        // Add to contact's relationships
        const oCreamSender = oCreamV2.getEntity(senderContact.getId()) as OCreamContactEntity;
        if (oCreamSender) {
          oCreamSender.addRelationship(relationship.id);
        }
      }
    }
  }

  private async storeInKnowledgeGraph(
    email: IncomingEmail,
    communication: Communication,
    knowledgeElements: any[]
  ): Promise<void> {
    // This would integrate with Neo4j or other graph databases
    // For now, we're storing in the O-CREAM-v2 ontology
    console.log(`📊 Stored email data in knowledge graph:
      - Email: ${email.messageId}
      - Communication: ${communication.getId()}
      - Knowledge Elements: ${knowledgeElements.length}
      - Graph nodes created: ${knowledgeElements.length + 2}`);
  }

  // Helper methods
  private extractEmailProvider(email: string): string {
    const domain = email.split('@')[1];
    if (domain.includes('gmail')) return 'Gmail';
    if (domain.includes('outlook') || domain.includes('hotmail')) return 'Outlook';
    if (domain.includes('yahoo')) return 'Yahoo';
    return 'Other';
  }

  private isDocumentFile(filename: string): boolean {
    const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    return docExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private requiresProcessing(contentType: string): boolean {
    return contentType.includes('pdf') || 
           contentType.includes('word') || 
           contentType.includes('spreadsheet');
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
} 