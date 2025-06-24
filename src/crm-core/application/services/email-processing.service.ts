// Email Processing Service
// Handles .eml file parsing, entity extraction, and knowledge graph integration

import { readFileSync } from 'fs';
import { join } from 'path';
import { SpacyEntityExtractionService, SpacyEntityExtractionResult } from './spacy-entity-extraction.service';
import { FinancialEntityIntegrationService, FinancialEntityContext } from '../../../extensions/financial/application/services/financial-entity-integration.service';
import { EmailIngestionService } from './email-ingestion.service';
import { ContactRepository } from '../../domain/repositories/contact-repository';
import { CommunicationRepository } from '../../domain/repositories/communication-repository';
import { InMemoryCommunicationRepository } from '../../infrastructure/repositories/in-memory-communication-repository';
import { Contact } from '../../domain/entities/contact';
import { OCreamV2Ontology, ActivityType, KnowledgeType, DOLCECategory, createInformationElement, InformationElement, CRMActivity, OCreamRelationship } from '../../domain/ontology/o-cream-v2';

export interface ParsedEmail {
  messageId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
  metadata: {
    size: number;
    encoding: string;
    contentType: string;
    priority?: 'high' | 'normal' | 'low';
  };
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}

export interface EmailProcessingResult {
  email: ParsedEmail;
  entityExtraction: SpacyEntityExtractionResult;
  contactResolution: {
    sender: Contact | null;
    recipients: Contact[];
    newContacts: Contact[];
  };
  knowledgeGraphInsertions: {
    entities: any[];
    relationships: any[];
    knowledgeElements: any[];
    activities: any[];
  };
  businessInsights: {
    emailClassification: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    priority: 'high' | 'medium' | 'low';
    actionItems: string[];
    followUpRequired: boolean;
    complianceFlags: string[];
  };
  financialAnalysis?: any;
  recommendations: string[];
}

export class EmailProcessingService {
  private entityExtractor: SpacyEntityExtractionService;
  private financialService: FinancialEntityIntegrationService;
  private emailIngestionService: EmailIngestionService;
  private contactRepository: ContactRepository;
  private ontology: OCreamV2Ontology;

  constructor(contactRepository: ContactRepository) {
    this.entityExtractor = new SpacyEntityExtractionService();
    this.financialService = new FinancialEntityIntegrationService(contactRepository);
    const communicationRepository = new InMemoryCommunicationRepository();
    this.emailIngestionService = new EmailIngestionService(contactRepository, communicationRepository);
    this.contactRepository = contactRepository;
    this.ontology = OCreamV2Ontology.getInstance();
  }

  /**
   * Process a single .eml file through the complete pipeline
   */
  public async processEmlFile(emlFilePath: string): Promise<EmailProcessingResult> {
    console.log(`📧 Processing EML file: ${emlFilePath}`);
    
    // 1. Parse .eml file
    const parsedEmail = await this.parseEmlFile(emlFilePath);
    console.log(`   ✅ Parsed email: ${parsedEmail.subject}`);

    // 2. Resolve/create contacts
    const contactResolution = await this.resolveContacts(parsedEmail);
    console.log(`   👥 Resolved ${contactResolution.recipients.length} contacts, created ${contactResolution.newContacts.length} new`);

    // 3. Extract entities from email content using spaCy
    const entityExtraction = await this.entityExtractor.extractEmailEntities(
      parsedEmail.subject,
      parsedEmail.body,
      parsedEmail.headers
    );
    console.log(`   🔍 Extracted ${entityExtraction.entityCount} entities with spaCy`);

    // 4. Financial analysis (if financial entities detected)
    let financialAnalysis;
    const hasFinancialEntities = entityExtraction.entities.some(entity => 
      entity.type.toString().includes('FINANCIAL') || entity.type.toString().includes('MONETARY') || entity.type.toString().includes('STOCK')
    );
    
    if (hasFinancialEntities) {
      const emailContent = `${parsedEmail.subject}\n\n${parsedEmail.body}`;
      const financialContext: FinancialEntityContext = {
        contactId: contactResolution.sender?.getId(),
        emailId: parsedEmail.messageId,
        documentType: 'EMAIL',
        businessContext: this.inferBusinessContext(parsedEmail, entityExtraction),
        clientSegment: this.inferClientSegment(contactResolution.sender),
        riskTolerance: 'MEDIUM' // Default, could be inferred from contact history
      };

      try {
        financialAnalysis = await this.financialService.processFinancialContent(
          emailContent,
          financialContext
        );
        console.log(`   💰 Financial analysis completed with ${entityExtraction.entities.filter(e => e.type.toString().includes('FINANCIAL')).length} financial entities`);
      } catch (error) {
        console.warn(`   ⚠️ Financial analysis failed:`, error);
      }
    }

    // 5. Insert into knowledge graph
    const knowledgeGraphInsertions = await this.insertIntoKnowledgeGraph(
      parsedEmail,
      entityExtraction,
      contactResolution
    );
    console.log(`   📊 Knowledge graph: ${knowledgeGraphInsertions.entities.length} entities, ${knowledgeGraphInsertions.relationships.length} relationships`);

    // 6. Generate business insights
    const businessInsights = await this.generateBusinessInsights(
      parsedEmail,
      entityExtraction,
      financialAnalysis
    );
    console.log(`   💡 Classification: ${businessInsights.emailClassification}, Sentiment: ${businessInsights.sentiment}`);

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(
      parsedEmail,
      entityExtraction,
      businessInsights,
      financialAnalysis
    );

    return {
      email: parsedEmail,
      entityExtraction,
      contactResolution,
      knowledgeGraphInsertions,
      businessInsights,
      financialAnalysis,
      recommendations
    };
  }

  /**
   * Process multiple .eml files in batch
   */
  public async processBatchEmlFiles(emlDirectory: string): Promise<{
    results: EmailProcessingResult[];
    summary: {
      totalEmails: number;
      totalEntities: number;
      totalContacts: number;
      financialEmails: number;
      complianceAlerts: number;
      averageConfidence: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    console.log(`📂 Processing batch EML files from: ${emlDirectory}`);

    const fs = require('fs');
    const path = require('path');
    
    const emlFiles = fs.readdirSync(emlDirectory)
      .filter((file: string) => file.endsWith('.eml'))
      .map((file: string) => path.join(emlDirectory, file));

    console.log(`   Found ${emlFiles.length} EML files`);

    const results: EmailProcessingResult[] = [];
    let totalEntities = 0;
    let totalContacts = 0;
    let financialEmails = 0;
    let complianceAlerts = 0;
    let totalConfidence = 0;

    for (const [index, emlFile] of emlFiles.entries()) {
      try {
        console.log(`\n📧 [${index + 1}/${emlFiles.length}] Processing: ${path.basename(emlFile)}`);
        
        const result = await this.processEmlFile(emlFile);
        results.push(result);

        // Update statistics
        totalEntities += result.entityExtraction.entityCount;
        totalContacts += result.contactResolution.newContacts.length;
        totalConfidence += result.entityExtraction.confidence;
        
        if (result.financialAnalysis) {
          financialEmails++;
        }
        
        complianceAlerts += result.businessInsights.complianceFlags.length;

      } catch (error) {
        console.error(`   ❌ Error processing ${emlFile}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const processingTime = Date.now() - startTime;
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    const summary = {
      totalEmails: results.length,
      totalEntities,
      totalContacts,
      financialEmails,
      complianceAlerts,
      averageConfidence,
      processingTime
    };

    console.log(`\n📊 Batch Processing Summary:`);
    console.log(`   📧 Emails processed: ${summary.totalEmails}`);
    console.log(`   🔍 Total entities: ${summary.totalEntities}`);
    console.log(`   👥 New contacts: ${summary.totalContacts}`);
    console.log(`   💰 Financial emails: ${summary.financialEmails}`);
    console.log(`   ⚠️  Compliance alerts: ${summary.complianceAlerts}`);
    console.log(`   🎯 Average confidence: ${(summary.averageConfidence * 100).toFixed(1)}%`);
    console.log(`   ⏱️  Processing time: ${summary.processingTime}ms`);

    return { results, summary };
  }

  /**
   * Parse .eml file format
   */
  private async parseEmlFile(emlFilePath: string): Promise<ParsedEmail> {
    const emlContent = readFileSync(emlFilePath, 'utf8');
    
    // Simple EML parser (in production, use a proper library like 'mailparser')
    const lines = emlContent.split('\n');
    const headers: Record<string, string> = {};
    let bodyStartIndex = 0;
    
    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') {
        bodyStartIndex = i + 1;
        break;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
    
    // Parse body
    const body = lines.slice(bodyStartIndex).join('\n').trim();
    
    // Extract structured data
    const messageId = headers['message-id'] || `generated_${Date.now()}`;
    const from = this.parseEmailAddress(headers['from'] || '');
    const to = this.parseEmailAddresses(headers['to'] || '');
    const cc = headers['cc'] ? this.parseEmailAddresses(headers['cc']) : [];
    const subject = headers['subject'] || '(No Subject)';
    const date = headers['date'] ? new Date(headers['date']) : new Date();
    
    return {
      messageId,
      from,
      to,
      cc,
      subject,
      body,
      date,
      headers,
      attachments: [], // Simplified - no attachment parsing
      metadata: {
        size: emlContent.length,
        encoding: 'utf-8',
        contentType: headers['content-type'] || 'text/plain',
        priority: this.extractPriority(headers)
      }
    };
  }

  /**
   * Resolve or create contacts from email addresses
   */
  private async resolveContacts(email: ParsedEmail): Promise<{
    sender: Contact | null;
    recipients: Contact[];
    newContacts: Contact[];
  }> {
    const sender = await this.findOrCreateContact(email.from);
    const recipients = await Promise.all(email.to.map(addr => this.findOrCreateContact(addr)));
    const newContacts = [sender, ...recipients].filter(c => (c as any)?.isNew);

    return {
      sender,
      recipients: recipients.filter(c => c) as Contact[],
      newContacts: newContacts.filter(c => c) as Contact[]
    };
  }

  private async findOrCreateContact(address: EmailAddress): Promise<Contact | null> {
    if (!address || !address.email) return null;
    let contact = await this.contactRepository.findByEmail(address.email);
    if (!contact) {
      contact = new Contact({
        name: address.name || address.email.split('@')[0],
        email: address.email
      });
      contact = await this.contactRepository.save(contact);
      (contact as any).isNew = true;
    }
    return contact;
  }

  /**
   * Insert extracted data into knowledge graph
   */
  private async insertIntoKnowledgeGraph(
    email: ParsedEmail,
    entityExtraction: SpacyEntityExtractionResult,
    contactResolution: any
  ): Promise<{
    entities: any[];
    relationships: any[];
    knowledgeElements: any[];
    activities: any[];
  }> {
    const senderId = contactResolution.sender.getId();

    // Create email entity
    const emailEntity = {
      id: email.messageId,
      type: 'Email',
      subject: email.subject,
      body: email.body.substring(0, 200), // snippet
      from: email.from.email,
      to: email.to.map(e => e.email),
      date: email.date,
      metadata: email.metadata
    };
    this.ontology.addEntity(emailEntity as any);

    // Create entities for extracted info
    for (const entity of entityExtraction.entities) {
      const ontologyEntity = {
        id: `${email.messageId}-${entity.value}`,
        type: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        context: entity.context,
        extractedFrom: email.messageId,
        metadata: entity.metadata
      };
      this.ontology.addEntity(ontologyEntity as any);

      // Link to sender
      const senderRelationship: OCreamRelationship = {
        id: `${senderId}-emailed_with-${ontologyEntity.id}`,
        relationshipType: 'INTERACTED_WITH',
        sourceEntityId: senderId,
        targetEntityId: ontologyEntity.id,
        temporal: {},
        properties: {
            type: 'email'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.ontology.addRelationship(senderRelationship);
    }
    
    // Add relationships for recipients
    for (const recipient of contactResolution.recipients) {
        const recipientRelationship: OCreamRelationship = {
            id: `${senderId}-emailed-${recipient.getId()}`,
            relationshipType: 'SENT_EMAIL_TO',
            sourceEntityId: senderId,
            targetEntityId: recipient.getId(),
            temporal: {},
            properties: {
                emailId: email.messageId,
                subject: email.subject
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.ontology.addRelationship(recipientRelationship);
    }
    
    const communicationKnowledge = createInformationElement({
      title: 'Email Analysis',
      type: KnowledgeType.COMMUNICATION_LOG,
      content: { 
        emailId: email.messageId,
        subject: email.subject,
        entityCount: entityExtraction.entityCount,
        confidence: entityExtraction.confidence,
        classification: 'some-classification' 
      },
      reliability: entityExtraction.confidence,
      source: 'EmailProcessingService',
      relatedEntities: [senderId]
    });
    this.ontology.addEntity(communicationKnowledge);

    const emailProcessingActivity: CRMActivity = {
      id: `activity-${email.messageId}`,
      category: DOLCECategory.PERDURANT,
      type: ActivityType.DATA_ANALYSIS,
      name: 'Email Processed',
      description: 'Processed email for entity extraction and analysis.',
      participants: [senderId],
      status: 'completed',
      success: true,
      context: { 
        emailId: email.messageId, 
        entitiesExtracted: entityExtraction.entityCount, 
        confidence: entityExtraction.confidence, 
        processingMethod: 'spacy' 
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ontology.addEntity(emailProcessingActivity);

    return {
      entities: [emailEntity, ...entityExtraction.entities],
      relationships: [], // Simplified
      knowledgeElements: [communicationKnowledge],
      activities: [emailProcessingActivity]
    };
  }

  /**
   * Generate business insights from processed email
   */
  private async generateBusinessInsights(
    email: ParsedEmail,
    entityExtraction: SpacyEntityExtractionResult,
    financialAnalysis?: any
  ): Promise<{
    emailClassification: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    priority: 'high' | 'medium' | 'low';
    actionItems: string[];
    followUpRequired: boolean;
    complianceFlags: string[];
  }> {
    // Email classification
    const emailClassification = this.classifyEmail(email, entityExtraction);
    
    // Sentiment analysis (simplified)
    const sentiment = this.analyzeSentiment(email.body);
    
    // Priority assessment
    const priority = this.assessPriority(email, entityExtraction, financialAnalysis);
    
    // Extract action items
    const actionItems = this.extractActionItems(email.body);
    
    // Follow-up assessment
    const followUpRequired = this.assessFollowUpRequired(email, entityExtraction);
    
    // Compliance flags
    const complianceFlags = this.identifyComplianceFlags(entityExtraction, financialAnalysis);
    
    return {
      emailClassification,
      sentiment,
      priority,
      actionItems,
      followUpRequired,
      complianceFlags
    };
  }

  // Helper methods
  private parseEmailAddress(addressString: string): EmailAddress {
    const match = addressString.match(/^(.+?)\s*<(.+?)>$/) || addressString.match(/^(.+)$/);
    if (match) {
      if (match.length === 3) {
        return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
      } else {
        return { email: match[1].trim() };
      }
    }
    return { email: addressString.trim() };
  }

  private parseEmailAddresses(addressString: string): EmailAddress[] {
    return addressString.split(',').map(addr => this.parseEmailAddress(addr.trim()));
  }

  private extractPriority(headers: Record<string, string>): 'high' | 'normal' | 'low' {
    const priority = headers['x-priority'] || headers['priority'] || '3';
    if (priority === '1' || priority.toLowerCase().includes('high')) return 'high';
    if (priority === '5' || priority.toLowerCase().includes('low')) return 'low';
    return 'normal';
  }

  private classifyEmail(email: ParsedEmail, entityExtraction: SpacyEntityExtractionResult): string {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    
    // Financial classifications
    if (entityExtraction.extensionResults.financial?.length > 0) {
      if (subject.includes('trade') || body.includes('transaction')) return 'FINANCIAL_TRANSACTION';
      if (subject.includes('portfolio') || body.includes('investment')) return 'INVESTMENT_ADVISORY';
      if (subject.includes('loan') || body.includes('credit')) return 'LENDING';
      return 'FINANCIAL_GENERAL';
    }
    
    // General classifications
    if (subject.includes('meeting') || body.includes('schedule')) return 'MEETING_REQUEST';
    if (subject.includes('proposal') || body.includes('proposal')) return 'BUSINESS_PROPOSAL';
    if (subject.includes('invoice') || body.includes('payment')) return 'BILLING';
    if (subject.includes('support') || body.includes('help')) return 'CUSTOMER_SUPPORT';
    
    return 'GENERAL_COMMUNICATION';
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['excellent', 'great', 'good', 'pleased', 'satisfied', 'thank', 'appreciate'];
    const negativeWords = ['problem', 'issue', 'concern', 'disappointed', 'unsatisfied', 'error', 'mistake'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.some(pos => word.includes(pos))).length;
    const negativeCount = words.filter(word => negativeWords.some(neg => word.includes(neg))).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private assessPriority(email: ParsedEmail, entityExtraction: SpacyEntityExtractionResult, financialAnalysis?: any): 'high' | 'medium' | 'low' {
    const text = (email.subject + ' ' + email.body).toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('!')) {
        return 'high';
    }
    if (entityExtraction.entities.some(e => e.type.toString().includes('COMPLIANCE'))) {
        return 'high';
    }
    if (financialAnalysis) {
        return 'medium';
    }
    if (entityExtraction.entityCount > 10) {
        return 'medium';
    }
    return 'low';
  }

  private extractActionItems(text: string): string[] {
    const actionItems: string[] = [];
    const actionPatterns = [
      /please\s+(.+?)(?:\.|$)/gi,
      /need\s+to\s+(.+?)(?:\.|$)/gi,
      /action\s+required:\s*(.+?)(?:\.|$)/gi,
      /follow\s+up\s+(.+?)(?:\.|$)/gi
    ];
    
    for (const pattern of actionPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          actionItems.push(match[1].trim());
        }
      }
    }
    
    return actionItems.slice(0, 5); // Limit to 5 action items
  }

  private assessFollowUpRequired(email: ParsedEmail, entityExtraction: SpacyEntityExtractionResult): boolean {
    const text = (email.subject + ' ' + email.body).toLowerCase();
    const followUpIndicators = [
      'please respond', 'need response', 'follow up', 'get back to', 
      'let me know', 'confirm', 'schedule', 'meeting'
    ];
    
    return followUpIndicators.some(indicator => text.includes(indicator));
  }

  private identifyComplianceFlags(entityExtraction: SpacyEntityExtractionResult, financialAnalysis?: any): string[] {
    const flags: string[] = [];
    
    // Example compliance flags based on entities
    const hasCurrency = entityExtraction.entities.some(e => e.type.toString() === 'CURRENCY');
    const hasFinancialAccount = entityExtraction.entities.some(e => e.type.toString() === 'ACCOUNT_NUMBER');
    
    if (hasCurrency && hasFinancialAccount) {
      flags.push('POTENTIAL_TRANSACTION_MONITORING');
    }

    if (financialAnalysis?.riskScore > 0.8) {
      flags.push('HIGH_RISK_TRANSACTION');
    }

    return flags;
  }

  private extractAmount(value: string): number | null {
    const match = value.match(/[\d,]+(?:\.\d{2})?/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }

  private inferBusinessContext(email: ParsedEmail, entityExtraction: SpacyEntityExtractionResult): 'INVESTMENT' | 'LENDING' | 'TRADING' | 'ADVISORY' | 'COMPLIANCE' {
    const text = `${email.subject} ${email.body}`.toLowerCase();
    if (text.includes('investment') || text.includes('portfolio')) return 'INVESTMENT';
    if (text.includes('loan') || text.includes('credit')) return 'LENDING';
    if (text.includes('trade') || text.includes('buy') || text.includes('sell')) return 'TRADING';
    if (text.includes('advice') || text.includes('recommendation')) return 'ADVISORY';
    if (text.includes('compliance') || text.includes('regulation')) return 'COMPLIANCE';
    return 'ADVISORY';
  }

  private inferClientSegment(contact: Contact | null): 'RETAIL' | 'CORPORATE' | 'INSTITUTIONAL' {
    if (!contact) return 'RETAIL';
    const company = (contact.getName() || '').toLowerCase(); // Simplified
    if (company.includes('inc') || company.includes('llc') || company.includes('ltd')) {
      return 'CORPORATE';
    }
    if (company.includes('fund') || company.includes('asset') || company.includes('capital')) {
      return 'INSTITUTIONAL';
    }
    return 'RETAIL';
  }

  private generateRecommendations(
    email: ParsedEmail,
    entityExtraction: SpacyEntityExtractionResult,
    businessInsights: any,
    financialAnalysis?: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Priority-based recommendations
    if (businessInsights.priority === 'high') {
      recommendations.push('Immediate attention required - high priority email');
    }
    
    // Financial recommendations
    if (financialAnalysis) {
      recommendations.push(...financialAnalysis.insights.recommendations.immediate);
      recommendations.push(...financialAnalysis.insights.recommendations.compliance);
    }
    
    // Follow-up recommendations
    if (businessInsights.followUpRequired) {
      recommendations.push('Schedule follow-up communication');
    }
    
    // Compliance recommendations
    if (businessInsights.complianceFlags.length > 0) {
      recommendations.push('Review compliance requirements');
    }
    
    // Entity-based recommendations
    if (entityExtraction.entityCount > 15) {
      recommendations.push('High entity density - consider automated processing');
    }
    
    return recommendations;
  }
} 