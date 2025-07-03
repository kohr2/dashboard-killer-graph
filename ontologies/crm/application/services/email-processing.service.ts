// Email Processing Service
// Handles .eml file parsing, entity extraction, and knowledge graph integration

import { readFileSync } from 'fs';
import { join } from 'path';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { SpacyEntityExtractionService, SpacyEntityExtractionResult } from './spacy-entity-extraction.service';
import type { ContactRepository } from '../../repositories/contact-repository';
import type { CommunicationRepository } from '../../repositories/communication-repository';
import { Neo4jCommunicationRepository } from '../../infrastructure/repositories/neo4j-communication-repository';
import { OCreamContactEntity, ContactOntology } from '../../domain/entities/contact-ontology';
import {
  OCreamV2Ontology,
  ActivityType,
  KnowledgeType,
  DOLCECategory,
  createInformationElement,
  InformationElement,
  Activity,
  OCreamRelationship,
} from '../../ontology/o-cream-v2';
import { CommunicationDTO, createContactDTO } from '@src/platform/enrichment/dto-aliases';
import { singleton, injectable, inject } from 'tsyringe';
import { EntityType } from './spacy-entity-extraction.service';
import { logger } from '@src/shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { ContactDTO } from '@generated/crm/generated/ContactDTO';
import { OrganizationDTO } from '@generated/crm/generated/OrganizationDTO';
import { PersonDTO } from '@generated/crm/generated/PersonDTO';
import { CommunicationDTO } from '@generated/crm/generated/CommunicationDTO';
import { User } from '@platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '@platform/security/domain/role';
import { AccessControlService } from '@platform/security/application/services/access-control.service';

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
  recommendations: string[];
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

export interface FinancialAnalysis {
  riskScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyMetrics: { [key: string]: number | string };
  complianceIssues: string[];
  summary: string;
}

export interface EmailProcessingResult {
  email: ParsedEmail;
  entityExtraction: SpacyEntityExtractionResult;
  contactResolution: {
    sender: OCreamContactEntity | null;
    recipients: OCreamContactEntity[];
    newContacts: OCreamContactEntity[];
  };
  knowledgeGraphInsertions: {
    entities: unknown[];
    relationships: unknown[];
    knowledgeElements: unknown[];
    activities: unknown[];
  };
  businessInsights: {
    emailClassification: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    priority: 'high' | 'medium' | 'low';
    actionItems: string[];
    followUpRequired: boolean;
    complianceFlags: string[];
  };
  financialAnalysis?: FinancialAnalysis;
  recommendations: string[];
}

@singleton()
export class EmailProcessingService {
  private ontology: OCreamV2Ontology;

  constructor(
    private contactRepository: ContactRepository,
    private communicationRepository: CommunicationRepository,
    private entityExtractor: SpacyEntityExtractionService,
  ) {
    this.ontology = OCreamV2Ontology.getInstance();
  }

  /**
   * Process a single .eml file through the complete pipeline
   */
  public async processEmlFile(emlFilePath: string): Promise<EmailProcessingResult> {
    logger.info(`📧 Processing EML file: ${emlFilePath}`);

    // 1. Parse .eml file
    const parsedEmail = await this.parseEmlFile(emlFilePath);

    // 2. Process attachments (placeholder for future integration)
    // TODO: Integrate AttachmentProcessor once the unified pipeline is complete
    let attachmentEntities: any[] = [];
    if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
      logger.info(`📎 Found ${parsedEmail.attachments.length} attachments - processing not yet integrated`);
      // Attachment processing will be integrated in the unified pipeline
    }

    // 3. Resolve/create contacts
    const contactResolution = await this.resolveContacts(parsedEmail);

    // 4. Extract entities from email content using spaCy
    const entityExtraction = await this.entityExtractor.extractEmailEntities(
      parsedEmail.subject,
      parsedEmail.body,
      parsedEmail.headers,
    );

    // Merge entities from attachments with email entities
    if (attachmentEntities.length > 0) {
      entityExtraction.entities.push(...attachmentEntities);
      entityExtraction.entityCount += attachmentEntities.length;
      logger.info(`🔗 Merged ${attachmentEntities.length} entities from attachments`);
    }

    // Enrich entities with metadata before sending to the knowledge graph
    entityExtraction.entities.forEach(entity => {
      entity.metadata = {
        ...(entity.metadata || {}),
        source: 'email-processing-service',
        relevanceScore: entity.confidence * (entity.context.length / parsedEmail.body.length),
      };
    });

    // 6. Insert into knowledge graph
    const knowledgeGraphInsertions = await this.insertIntoKnowledgeGraph(
      parsedEmail,
      entityExtraction,
      contactResolution
    );

    // 7. Generate business insights
    const businessInsights = await this.generateBusinessInsights(
      parsedEmail,
      entityExtraction,
    );

    // 8. Generate recommendations
    const recommendations = this.generateRecommendations(
      parsedEmail,
      entityExtraction,
      businessInsights,
    );

    return {
      email: parsedEmail,
      entityExtraction,
      contactResolution,
      knowledgeGraphInsertions,
      businessInsights,
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
    logger.info(`📂 Processing batch EML files from: ${emlDirectory}`);

    const fs = require('fs');
    const path = require('path');
    
    const emlFiles = fs.readdirSync(emlDirectory)
      .filter((file: string) => file.endsWith('.eml'))
      .map((file: string) => path.join(emlDirectory, file));

    logger.info(`   Found ${emlFiles.length} EML files`);

    const results: EmailProcessingResult[] = [];
    let totalEntities = 0;
    let totalContacts = 0;
    let financialEmails = 0;
    let complianceAlerts = 0;
    let totalConfidence = 0;

    for (const [index, emlFile] of emlFiles.entries()) {
      try {
        logger.info(`\n📧 [${index + 1}/${emlFiles.length}] Processing: ${path.basename(emlFile)}`);
        
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
        logger.error(`   ❌ Error processing ${emlFile}:`, error instanceof Error ? error.message : 'Unknown error');
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

    logger.info(`\n📊 Batch Processing Summary:`);
    logger.info(`   📧 Emails processed: ${summary.totalEmails}`);
    logger.info(`   🔍 Total entities: ${summary.totalEntities}`);
    logger.info(`   👥 New contacts: ${summary.totalContacts}`);
    logger.info(`   💰 Financial emails: ${summary.financialEmails}`);
    logger.info(`   ⚠️  Compliance alerts: ${summary.complianceAlerts}`);
    logger.info(`   🎯 Average confidence: ${(summary.averageConfidence * 100).toFixed(1)}%`);
    logger.info(`   ⏱️  Processing time: ${summary.processingTime}ms`);

    return { results, summary };
  }

  /**
   * Parse .eml file format
   */
  private convertAddress(address: AddressObject | AddressObject[] | undefined): EmailAddress[] {
    if (!address) return [];
    
    // mailparser returns a single object for 'from' and an array for 'to', 'cc', etc.
    const addresses = Array.isArray(address) ? address : [address];
    
    return addresses
      .map(a => a.text) // Use the 'text' property which is a string representation
      .filter(Boolean) // Filter out any empty/null/undefined values
      .map(this.parseEmailAddressFromString);
  }
  
  // A helper to parse a string like "John Doe <john.doe@example.com>"
  private parseEmailAddressFromString(addressString: string): EmailAddress {
    const match = addressString.match(/^(.*)<(.+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    // If no name, the whole string is the email
    return { name: '', email: addressString.trim() };
  }

  private async parseEmlFile(emlFilePath: string): Promise<ParsedEmail> {
    const emlContent = readFileSync(emlFilePath, 'utf-8');
    let parsed = await simpleParser(emlContent);
    
    // Fallback for badly formatted emails where headers are in the body
    if (!parsed.from && parsed.text) {
        const lines = parsed.text.split('\n');
        const headerRegex = /^(from|to|cc|subject|date):/i;
        const headersFromText: Record<string, string> = {};
        let bodyStartIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(headerRegex);
            if (match) {
                headersFromText[match[1].toLowerCase()] = line.substring(match[1].length + 1).trim();
            } else if (line.trim() === '') {
                bodyStartIndex = i + 1;
                break;
            }
        }
        
        if (Object.keys(headersFromText).length > 0) {
            const fromText = headersFromText['from'];
            const toText = headersFromText['to'];
            if (fromText) {
                parsed.from = { value: [{ address: fromText, name: '' }], text: fromText, html: fromText };
            }
            if (toText) {
                parsed.to = { value: [{ address: toText, name: '' }], text: toText, html: toText };
            }
            parsed.subject = parsed.subject || headersFromText['subject'];
            parsed.date = parsed.date || new Date(headersFromText['date']);
            parsed.text = lines.slice(bodyStartIndex).join('\n');
        }
    }

    const fromAddresses = this.convertAddress(parsed.from);
    const toAddresses = this.convertAddress(parsed.to);
    const ccAddresses = this.convertAddress(parsed.cc);

    const headersRecord: Record<string, string> = {};
    for (const [key, value] of parsed.headers.entries()) {
        if (typeof value === 'string') {
            headersRecord[key] = value;
        }
    }

    return {
      messageId: parsed.messageId || `generated_${Date.now()}`,
      from: fromAddresses[0] || { name: '', email: '' },
      to: toAddresses,
      cc: ccAddresses,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      headers: headersRecord,
      attachments: parsed.attachments.map(att => ({
        filename: att.filename || 'attachment',
        contentType: att.contentType,
        size: att.size,
        content: att.content,
      })),
      metadata: {
        size: emlContent.length,
        encoding: parsed.headers.get('content-transfer-encoding')?.toString() || '7bit',
        contentType: parsed.headers.get('content-type')?.toString() || 'text/plain',
        priority: this.extractPriority(headersRecord),
      },
      recommendations: []
    };
  }

  /**
   * Resolve or create contacts from email addresses
   */
  private async resolveContacts(email: ParsedEmail): Promise<{
    sender: OCreamContactEntity | null;
    recipients: OCreamContactEntity[];
    newContacts: OCreamContactEntity[];
  }> {
    const sender = await this.findOrCreateContact(email.from);
    const recipients = await Promise.all(email.to.map(addr => this.findOrCreateContact(addr)));
    const newContacts = [sender, ...recipients].filter(c => (c as any)?.isNew);

    return {
      sender,
      recipients: recipients.filter(c => c) as OCreamContactEntity[],
      newContacts: newContacts.filter(c => c) as OCreamContactEntity[]
    };
  }

  private async findOrCreateContact(address: EmailAddress): Promise<OCreamContactEntity | null> {
    // First try to find existing contact by email
    const existingContact = await this.contactRepository.findByEmail(address.email);
    if (existingContact) {
      // Convert DTO back to legacy entity for return
      return {
        id: existingContact.id,
        personalInfo: {
          firstName: existingContact.firstName,
          lastName: existingContact.lastName,
          email: existingContact.email,
          phone: existingContact.phone,
          title: existingContact.title,
        },
        getId: () => existingContact.id,
        getName: () => existingContact.name,
        addActivity: (id: string) => ({ id }),
        addKnowledgeElement: (id: string) => ({ id }),
        getActivities: () => [],
        getKnowledgeElements: () => [],
        getOntologyMetadata: () => ({ validationStatus: 'VALID' }),
        // Add missing methods to satisfy OCreamContactEntity interface
        updatePersonalInfo: () => {},
        updatePreferences: () => {},
        updateStatus: () => {},
        markAsModified: () => {},
        getPersonalInfo: () => ({ firstName: '', lastName: '', email: '', phone: '', title: '' }),
        getPreferences: () => ({}),
        getStatus: () => 'ACTIVE',
        isModified: () => false,
        getCreatedAt: () => new Date(),
        getUpdatedAt: () => new Date(),
      } as unknown as OCreamContactEntity;
    }

    // Create new contact if not found
    const [firstName, ...lastNameParts] = (address.name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const contactDTO = createContactDTO({
      firstName,
      lastName,
      email: address.email,
    });
    
    await this.contactRepository.save(contactDTO);
    
    // Return legacy entity for compatibility
    return {
      id: contactDTO.id,
      category: DOLCECategory.PhysicalObject,
      name: contactDTO.name,
      description: contactDTO.description,
      createdAt: new Date(contactDTO.createdAt),
      updatedAt: new Date(contactDTO.updatedAt),
      personalInfo: {
        firstName: contactDTO.firstName,
        lastName: contactDTO.lastName,
        email: contactDTO.email,
        phone: contactDTO.phone,
        title: contactDTO.title,
        address: contactDTO.address,
      },
      organizationId: contactDTO.organizationId,
      activities: [],
      knowledgeElements: [],
      ontologyMetadata: {
        validationStatus: contactDTO.validationStatus.toLowerCase() as 'valid' | 'invalid' | 'unchecked',
      },
      metadata: {},
      enrichedData: {},
      preferences: contactDTO.preferences ? JSON.parse(contactDTO.preferences) : {},
      getId() { return this.id; },
      getName() { return this.name; },
      addActivity(activityId: string) { this.activities.push(activityId); },
      addKnowledgeElement(elementId: string) { this.knowledgeElements.push(elementId); },
      updatePersonalInfo(info: any) { this.personalInfo = { ...this.personalInfo, ...info }; },
      updatePreferences(prefs: Record<string, any>) { this.preferences = { ...this.preferences, ...prefs }; },
      updateStatus(status: unknown) { /* placeholder */ },
      markAsModified() { this.updatedAt = new Date(); },
      get label() { return 'Contact'; },
    } as OCreamContactEntity;
  }

  /**
   * Insert extracted data into knowledge graph
   */
  private async insertIntoKnowledgeGraph(
    email: ParsedEmail,
    entityExtraction: SpacyEntityExtractionResult,
    contactResolution: {
      sender: OCreamContactEntity | null;
      recipients: OCreamContactEntity[];
    },
  ): Promise<{
    entities: unknown[];
    relationships: unknown[];
    knowledgeElements: unknown[];
    activities: unknown[];
  }> {
    logger.info(`     🧠 Inserting into Knowledge Graph...`);

    // 1. Save the communication activity
    const communicationDTO: CommunicationDTO = {
      id: email.messageId,
      name: email.subject,
      type: 'email',
      label: 'Communication',
      enrichedData: '',
      status: 'processed',
      subject: email.subject,
      body: email.body,
      sender: email.from.email,
      recipients: email.to.map(r => r.email).join(','),
      timestamp: email.date.toISOString(),
      metadata: JSON.stringify({ parsed: email.metadata }),
      channel: 'email',
      priority: email.metadata.priority || 'normal',
      duration: '',
      attachments: email.attachments.length > 0 ? email.attachments.map(a => a.filename).join(',') : '',
      tags: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const communication = await this.communicationRepository.save(communicationDTO);

    const { entities } = entityExtraction;

    // Separate email entities from others
    const emailEntities = entities.filter(
      (e) => e.type === EntityType.EMAIL_ADDRESS,
    );
    const otherEntities = entities.filter(
      (e) => e.type !== EntityType.EMAIL_ADDRESS,
    );

    // 2. Add email addresses as properties to contacts
    if (contactResolution.sender && emailEntities.length > 0) {
      // Assuming the first email entity belongs to the sender if not already present
      const senderEmail = contactResolution.sender.personalInfo.email;
      const newEmail = emailEntities.find((e) => e.value !== senderEmail);
      if (newEmail) {
        // This method needs to be created in the repository
        await this.contactRepository.addEmailToContact(contactResolution.sender.getId(), newEmail.value);
      }
    }

    // Handle recipient emails similarly if needed...

    // 3. Link other entities to the communication
    if (otherEntities.length > 0) {
      await (
        this.communicationRepository as Neo4jCommunicationRepository
      ).linkEntitiesToCommunication(communication.id, otherEntities);
    }

    // Update properties on the communication node with literal values
    const literalEntities = entities.filter((e) => {
      try {
        this.ontology.getEntity(e.type as any);
        return false; // It's an entity, not a literal
      } catch (error) {
        return true; // Not found, so it's a literal
      }
    });

    if (literalEntities.length > 0) {
      const literalUpdates = literalEntities.reduce((acc, lit) => {
        acc[lit.type] = lit.value;
        return acc;
      }, {} as Record<string, any>);
      await this.communicationRepository.updateProperties(
        communication.id,
        literalUpdates,
      );
    }

    // 4. Create relationships between the communication and contacts
    if (contactResolution.sender) {
      // This needs a dedicated method in the repository, e.g., linkContactToCommunication
      // await (
      //   this.communicationRepository as Neo4jCommunicationRepository
      // ).linkContactToCommunication(communication.id, contactResolution.sender.id, 'SENDER');
    }
    contactResolution.recipients.forEach(recipient => {
      // await (
      //   this.communicationRepository as Neo4jCommunicationRepository
      // ).linkContactToCommunication(communication.id, recipient.id, 'RECIPIENT');
    });

    // TODO: Refactor this part to align with the new Activity and InformationElement interfaces.
    // The following code is commented out due to a type mismatch after ontology refactoring.
    /*
    const activity: Activity = {
      id: `email-processing-${new Date().toISOString()}`,
      category: DOLCECategory.SocialObject,
      activityType: ActivityType.DATACOLLECTION,
      name: 'Email Processing',
      description: 'Automated processing of an incoming email.',
      participants: [contactResolution.sender, ...contactResolution.recipients].filter(
        (c): c is OCreamContactEntity => c !== null
      ),
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      success: true,
      context: { emailId: email.id },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ontology.addEntity(activity);
    */

    return {
      entities: otherEntities,
      relationships: [], // Relationships are now created directly
      knowledgeElements: [], // Placeholder for now
      activities: [], // Placeholder for now
    };
  }

  /**
   * Generate business insights from processed email
   */
  private async generateBusinessInsights(
    email: ParsedEmail,
    entityExtraction: SpacyEntityExtractionResult,
    financialAnalysis?: FinancialAnalysis
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
    if (entityExtraction.extensionResults && entityExtraction.extensionResults.financial?.length > 0) {
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

  private assessPriority(email: ParsedEmail, entityExtraction: SpacyEntityExtractionResult, financialAnalysis?: FinancialAnalysis): 'high' | 'medium' | 'low' {
    if (email.metadata.priority === 'high') return 'high';
    if (financialAnalysis && financialAnalysis.riskScore > 0.8) return 'high';
    if (entityExtraction.entities.some(e => e.type === ('COMPLAINT' as any))) return 'high';
    if (entityExtraction.entities.some(e => e.type === ('URGENT_REQUEST' as any))) return 'high';
    return 'medium';
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
    return entityExtraction.entities.some(e => e.type === ('QUESTION' as any));
  }

  private identifyComplianceFlags(entityExtraction: SpacyEntityExtractionResult, financialAnalysis?: FinancialAnalysis): string[] {
    const flags: string[] = [];
    if (financialAnalysis?.complianceIssues && financialAnalysis.complianceIssues.length > 0) {
      flags.push(...financialAnalysis.complianceIssues);
    }
    if (entityExtraction.entities.some(e => e.type === ('INSIDER_TRADING_RISK' as any))) {
      flags.push('Potential insider trading risk detected');
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

  private inferClientSegment(contact: OCreamContactEntity | null): 'RETAIL' | 'CORPORATE' | 'INSTITUTIONAL' {
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
    businessInsights: {
      emailClassification: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      priority: 'high' | 'medium' | 'low';
      actionItems: string[];
      followUpRequired: boolean;
      complianceFlags: string[];
    },
    financialAnalysis?: FinancialAnalysis
  ): string[] {
    const recommendations: string[] = [];
    if (businessInsights.priority === 'high') {
      recommendations.push('Action required: This is a high-priority email.');
    }
    if (businessInsights.followUpRequired) {
      recommendations.push('Follow-up required with the client.');
    }
    if (businessInsights.complianceFlags.length > 0) {
      recommendations.push(`Compliance alert: ${businessInsights.complianceFlags.join(', ')}`);
    }
    if (financialAnalysis && financialAnalysis.riskScore > 0.9) {
      recommendations.push('High financial risk detected. Escalate to risk management team.');
    }
    return recommendations;
  }
}