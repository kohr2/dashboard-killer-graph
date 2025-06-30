/**
 * Attachment Processor
 * Handles processing of email attachments, text extraction, and entity extraction
 */

import { singleton } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import {
  EmailAttachment,
  ProcessedAttachment,
  AttachmentProcessingResult,
  AttachmentProcessingError,
  ExtractedEntity,
} from '../types/email.interface';

@singleton()
export class AttachmentProcessor {
  private readonly supportedTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
  ]);

  /**
   * Process multiple email attachments
   */
  async processAttachments(attachments: EmailAttachment[]): Promise<AttachmentProcessingResult> {
    const startTime = Date.now();
    logger.info(`📎 Processing ${attachments.length} attachment(s)`);

    if (attachments.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        supportedFormats: 0,
        unsupportedFormats: 0,
        processedAttachments: [],
        extractedEntities: [],
        errors: [],
        totalProcessingTime: 0,
      };
    }

    const processedAttachments: ProcessedAttachment[] = [];
    const allExtractedEntities: ExtractedEntity[] = [];
    const errors: AttachmentProcessingError[] = [];
    let supportedCount = 0;
    let unsupportedCount = 0;

    for (const attachment of attachments) {
      try {
        const processed = await this.processSingleAttachment(attachment);
        processedAttachments.push(processed);

        if (processed.supportedFormat) {
          supportedCount++;
          if (processed.entities) {
            allExtractedEntities.push(...processed.entities);
          }
        } else {
          unsupportedCount++;
        }

        if (processed.error) {
          errors.push({
            filename: attachment.filename,
            error: processed.error,
            timestamp: new Date(),
            recoverable: true,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error processing attachment ${attachment.filename}:`, error);
        
        processedAttachments.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          supportedFormat: false,
          error: errorMessage,
        });

        errors.push({
          filename: attachment.filename,
          error: errorMessage,
          timestamp: new Date(),
          recoverable: false,
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    logger.info(`✅ Completed processing ${attachments.length} attachments in ${totalProcessingTime}ms`);

    return {
      success: true,
      totalProcessed: attachments.length,
      supportedFormats: supportedCount,
      unsupportedFormats: unsupportedCount,
      processedAttachments,
      extractedEntities: allExtractedEntities,
      errors,
      totalProcessingTime,
    };
  }

  /**
   * Process a single attachment
   */
  private async processSingleAttachment(attachment: EmailAttachment): Promise<ProcessedAttachment> {
    const processingStart = Date.now();
    
    if (!this.isSupportedFileType(attachment.contentType)) {
      logger.warn(`Skipping unsupported attachment type: ${attachment.contentType} for file: ${attachment.filename}`);
      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        supportedFormat: false,
        skipReason: `Unsupported file type: ${attachment.contentType}`,
        processingDuration: Date.now() - processingStart,
      };
    }

    if (!attachment.content || attachment.content.length === 0) {
      const errorMsg = 'Empty or missing attachment content';
      logger.error(`Error processing attachment ${attachment.filename}: ${errorMsg}`);
      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        supportedFormat: true,
        error: errorMsg,
        processingDuration: Date.now() - processingStart,
      };
    }

    try {
      let extractedText = '';
      let processingMethod: ProcessedAttachment['processingMethod'] = 'SKIP';

      // Extract text based on content type
      if (attachment.contentType === 'application/pdf') {
        extractedText = await this.extractTextFromPdf(attachment.content);
        processingMethod = 'PDF_TEXT_EXTRACTION';
      } else if (
        attachment.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        attachment.contentType === 'application/msword'
      ) {
        extractedText = await this.extractTextFromDocx(attachment.content);
        processingMethod = 'DOCX_TEXT_EXTRACTION';
      } else if (attachment.contentType.startsWith('image/')) {
        extractedText = await this.extractTextFromImage(attachment.content);
        processingMethod = 'OCR';
      } else if (attachment.contentType === 'text/plain') {
        extractedText = attachment.content.toString('utf-8');
        processingMethod = 'PDF_TEXT_EXTRACTION'; // Using this as plain text method
      }

      // Extract entities from the text
      const entities = await this.extractEntitiesFromText(extractedText, attachment.filename);

      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        supportedFormat: true,
        processingMethod,
        extractedText,
        entities,
        processingDuration: Date.now() - processingStart,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        supportedFormat: true,
        error: errorMessage,
        processingDuration: Date.now() - processingStart,
      };
    }
  }

  /**
   * Extract text from PDF buffer
   * TODO: Implement actual PDF text extraction using pdf-parse or similar
   */
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    // Mock implementation for now - replace with actual PDF parsing
    logger.debug('Extracting text from PDF attachment (mock implementation)');
    return `Extracted text from PDF (${pdfBuffer.length} bytes)`;
  }

  /**
   * Extract text from DOCX buffer
   * TODO: Implement actual DOCX text extraction using mammoth or similar
   */
  async extractTextFromDocx(docxBuffer: Buffer): Promise<string> {
    // Mock implementation for now - replace with actual DOCX parsing
    logger.debug('Extracting text from DOCX attachment (mock implementation)');
    return `Extracted text from DOCX (${docxBuffer.length} bytes)`;
  }

  /**
   * Extract text from image using OCR
   * TODO: Implement actual OCR using tesseract.js or similar
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    // Mock implementation for now - replace with actual OCR
    logger.debug('Extracting text from image attachment using OCR (mock implementation)');
    return `OCR extracted text from image (${imageBuffer.length} bytes)`;
  }

  /**
   * Extract entities from text
   * TODO: Integrate with existing entity extraction service
   */
  private async extractEntitiesFromText(text: string, source: string): Promise<ExtractedEntity[]> {
    // Mock implementation - integrate with SpacyEntityExtractionService later
    const mockEntities: ExtractedEntity[] = [];
    
    // Simple pattern matching for demonstration
    const patterns = [
      { regex: /\$[\d,]+/g, type: 'MONETARY' },
      { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, type: 'PERSON' },
      { regex: /\b[A-Z][a-zA-Z\s]+Inc\.|LLC|Corp\./g, type: 'ORGANIZATION' },
    ];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern.regex);
      for (const match of matches) {
        if (match.index !== undefined) {
          mockEntities.push({
            text: match[0],
            type: pattern.type,
            confidence: 0.8,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
            metadata: {
              source: source,
              extraction_method: 'pattern_matching',
            },
          });
        }
      }
    });

    return mockEntities;
  }

  /**
   * Check if file type is supported for processing
   */
  isSupportedFileType(contentType: string): boolean {
    return this.supportedTypes.has(contentType);
  }
}

export type { AttachmentProcessingResult }; 