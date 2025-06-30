/**
 * Email Processor - Migrated from CRM services
 * Handles email parsing, entity extraction, and knowledge graph integration
 * 
 * MIGRATION NOTE: This file was migrated from:
 * src/ontologies/crm/application/services/email-processing.service.ts
 */

import { readFileSync } from 'fs';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { singleton } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import { AttachmentProcessor, AttachmentProcessingResult } from './attachment-processor';
import { EmailAttachment, ExtractedEntity } from '../types/email.interface';

// Imports will be updated during architecture refactoring
// import { SpacyEntityExtractionService } from '../../../intelligence/nlp/entity-extractor';
// import { NormalizedData } from '../../../core/types/normalized-data.interface';

export interface EmailProcessingResult {
  success: boolean;
  email: ParsedEmailData | null; // TODO: Define proper email type
  entities: ExtractedEntity[]; // TODO: Use unified entity types
  relationships: unknown[]; // TODO: Use unified relationship types
  insights: unknown; // TODO: Use unified insights type
  attachmentProcessing?: AttachmentProcessingResult;
  errors: string[];
}

export interface ParsedEmailData {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
}

@singleton()
export class EmailProcessor {
  private attachmentProcessor: AttachmentProcessor;

  constructor(
    // TODO: Inject unified services
    // private entityExtractor: EntityExtractor,
    // private storageManager: StorageManager
  ) {
    this.attachmentProcessor = new AttachmentProcessor();
  }

  /**
   * Process a single .eml file through the unified pipeline
   * TODO: Refactor to use unified interfaces
   */
  async processEmlFile(emlFilePath: string): Promise<EmailProcessingResult> {
    logger.info(`📧 Processing EML file: ${emlFilePath}`);
    
    // Implementation pending using unified pipeline
    // 1. Parse email
    // 2. Normalize to unified format
    // 3. Extract entities using unified extractor
    // 4. Store using unified storage manager
    
    return {
      success: false,
      email: null,
      entities: [],
      relationships: [],
      insights: null,
      errors: ['Implementation pending for unified pipeline']
    };
  }

  /**
   * Process a single .eml file with attachment processing capabilities
   */
  async processEmlFileWithAttachments(emlFilePath: string): Promise<EmailProcessingResult> {
    logger.info(`📧 Processing EML file with attachments: ${emlFilePath}`);
    
    try {
      // 1. Parse email
      const parsedEmail = await this.parseEmlFile(emlFilePath);
      
      // 2. Process attachments
      let attachmentProcessing: AttachmentProcessingResult | undefined;
      const allEntities: ExtractedEntity[] = [];
      
      try {
        attachmentProcessing = await this.attachmentProcessor.processAttachments(parsedEmail.attachments);
        
        // Merge entities from attachments
        if (attachmentProcessing.extractedEntities) {
          allEntities.push(...attachmentProcessing.extractedEntities);
        }
        
        logger.info(`✅ Processed ${attachmentProcessing.totalProcessed} attachments`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown attachment processing error';
        logger.error(`Error processing attachments for ${emlFilePath}:`, error);
        
        return {
          success: false,
          email: parsedEmail,
          entities: [],
          relationships: [],
          insights: null,
          errors: [errorMessage]
        };
      }

      // 3. Extract entities from email content (mock implementation)
      const emailEntities = await this.extractEntitiesFromEmailContent(parsedEmail);
      allEntities.push(...emailEntities);

      // 4. TODO: Extract relationships
      // 5. TODO: Generate insights
      // 6. TODO: Store using unified storage manager

      return {
        success: true,
        email: parsedEmail,
        entities: allEntities,
        relationships: [], // TODO: Implement relationship extraction
        insights: null, // TODO: Implement insights generation
        attachmentProcessing,
        errors: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing EML file ${emlFilePath}:`, error);
      
      return {
        success: false,
        email: null,
        entities: [],
        relationships: [],
        insights: null,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Parse .eml file using mailparser
   */
  private async parseEmlFile(emlFilePath: string): Promise<ParsedEmailData> {
    const emlContent = readFileSync(emlFilePath, 'utf-8');
    const parsed = await simpleParser(emlContent);

    // Convert parsed attachments to our format
    const attachments: EmailAttachment[] = parsed.attachments?.map(att => ({
      filename: att.filename || 'attachment',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || 0,
      content: att.content,
    })) || [];

    // Extract email addresses
    const fromAddresses = this.convertAddressObject(parsed.from);
    const toAddresses = this.convertAddressObject(parsed.to);
    const ccAddresses = this.convertAddressObject(parsed.cc);
    const bccAddresses = this.convertAddressObject(parsed.bcc);

    // Convert headers to record
    const headersRecord: Record<string, string> = {};
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        headersRecord[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    return {
      messageId: parsed.messageId || `generated_${Date.now()}`,
      from: fromAddresses[0] || 'unknown@unknown.com',
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      headers: headersRecord,
      attachments,
    };
  }

  /**
   * Convert AddressObject to string array
   */
  private convertAddressObject(address: AddressObject | AddressObject[] | undefined): string[] {
    if (!address) return [];
    
    const addresses = Array.isArray(address) ? address : [address];
    return addresses.flatMap(addr => 
      addr.value?.map(val => val.address || '') || []
    ).filter(Boolean);
  }

  /**
   * Extract entities from email content (mock implementation)
   * TODO: Integrate with existing entity extraction service
   */
  private async extractEntitiesFromEmailContent(email: ParsedEmailData): Promise<ExtractedEntity[]> {
    const content = `${email.subject} ${email.body}`;
    const entities: ExtractedEntity[] = [];
    
    // Simple pattern matching for demonstration
    const patterns = [
      { regex: /\$[\d,]+(?:\.\d{2})?[MK]?/g, type: 'MONETARY' },
      { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, type: 'PERSON' },
      { regex: /\b[A-Z][a-zA-Z\s]+(?:Inc\.|LLC|Corp\.|Company|Ltd\.)\b/g, type: 'ORGANIZATION' },
      { regex: /\b\d{4}-\d{2}-\d{2}\b/g, type: 'DATE' },
    ];

    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        if (match.index !== undefined) {
          entities.push({
            text: match[0],
            type: pattern.type,
            confidence: 0.7, // Lower confidence for simple pattern matching
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
            metadata: {
              source: 'email_content',
              extraction_method: 'pattern_matching',
            },
          });
        }
      }
    });

    return entities;
  }

  // TODO: Migrate other methods from original service
}
