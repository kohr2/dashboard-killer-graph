/**
 * Email Processor - Migrated from CRM services
 * Handles email parsing, entity extraction, and knowledge graph integration
 * 
 * MIGRATION NOTE: This file was migrated from:
 * src/ontologies/crm/application/services/email-processing.service.ts
 */

import { logger } from '@shared/utils/logger';
import type { IEmailParsingService, ParsedEmailDataMinimal as ParsedEmailData } from '@common/interfaces/email-parsing.interface';
import type { IAttachmentProcessingService, AttachmentProcessingResultMinimal as AttachmentProcessingResult } from '@common/interfaces/attachment-processing.interface';
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

export class EmailProcessor {
  constructor(
    private emailParsingService: IEmailParsingService,
    private attachmentProcessingService: IAttachmentProcessingService,
    // TODO: Inject unified services
    // private entityExtractor: EntityExtractor,
    // private storageManager: StorageManager
  ) {}

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
      // 1. Parse email using platform service
      const parsedEmail = await this.emailParsingService.parseEmlFile(emlFilePath);
      
      // 2. Process attachments using platform service
      let attachmentProcessing: AttachmentProcessingResult | undefined;
      const allEntities: ExtractedEntity[] = [];
      
      try {
        attachmentProcessing = await this.attachmentProcessingService.processAttachments(parsedEmail.attachments);
        
        // Merge entities from attachments (convert platform entities to local format)
        if (attachmentProcessing.extractedEntities) {
          const convertedEntities = attachmentProcessing.extractedEntities.map(entity => ({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            confidence: entity.confidence,
            source: entity.source,
            text: entity.name, // Use name as text for compatibility
            position: { start: 0, end: entity.name.length }, // Mock position
            properties: entity.properties || {}
          }));
          allEntities.push(...convertedEntities);
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
