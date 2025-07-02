import { singleton } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import xlsx from 'node-xlsx';
import * as officeParser from 'officeparser';
import { EmailAttachment } from './email-parsing.service';

export interface ProcessedAttachment {
  filename: string;
  contentType: string;
  size: number;
  supportedFormat: boolean;
  processingMethod?: 'PDF_TEXT_EXTRACTION' | 'DOCX_TEXT_EXTRACTION' | 'Excel' | 'PowerPoint' | 'OCR' | 'SKIP';
  extractedText?: string;
  entities?: ExtractedEntity[];
  error?: string;
  skipReason?: string;
  processingDuration: number;
}

export interface ExtractedEntity {
  id: string;
  name: string;
  type: string;
  confidence: number;
  source: string;
  properties?: Record<string, any>;
}

export interface AttachmentProcessingResult {
  success: boolean;
  totalProcessed: number;
  supportedFormats: number;
  unsupportedFormats: number;
  processedAttachments: ProcessedAttachment[];
  extractedEntities: ExtractedEntity[];
  errors: AttachmentProcessingError[];
  totalProcessingTime: number;
}

export interface AttachmentProcessingError {
  filename: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

@singleton()
export class AttachmentProcessingService {
  private readonly supportedTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel XLSX
    'application/vnd.ms-excel', // Excel XLS
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PowerPoint PPTX
    'application/vnd.ms-powerpoint', // PowerPoint PPT
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
          processingDuration: 0,
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
      } else if (
        attachment.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        attachment.contentType === 'application/vnd.ms-excel'
      ) {
        extractedText = await this.extractTextFromExcel(attachment.content);
        processingMethod = 'Excel';
      } else if (
        attachment.contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        attachment.contentType === 'application/vnd.ms-powerpoint'
      ) {
        extractedText = await this.extractTextFromPowerPoint(attachment.content);
        processingMethod = 'PowerPoint';
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
   * Extract text from PDF using officeparser
   */
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    try {
      const result = await officeParser.parseOfficeAsync(pdfBuffer);
      return result.text || '';
    } catch (error) {
      logger.error('Error extracting text from PDF:', error);
      return '';
    }
  }

  /**
   * Extract text from DOCX using officeparser
   */
  async extractTextFromDocx(docxBuffer: Buffer): Promise<string> {
    try {
      const result = await officeParser.parseOfficeAsync(docxBuffer);
      return result.text || '';
    } catch (error) {
      logger.error('Error extracting text from DOCX:', error);
      return '';
    }
  }

  /**
   * Extract text from image using OCR (placeholder implementation)
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    // TODO: Implement actual OCR using Tesseract or similar
    logger.warn('OCR not implemented yet, returning empty string');
    return '';
  }

  /**
   * Extract text from Excel files
   */
  async extractTextFromExcel(excelBuffer: Buffer): Promise<string> {
    try {
      const sheets = xlsx.parse(excelBuffer);
      const textParts: string[] = [];

      for (const sheet of sheets) {
        if (sheet.data && Array.isArray(sheet.data)) {
          for (const row of sheet.data) {
            if (Array.isArray(row)) {
              const rowText = row
                .map(cell => (cell !== null && cell !== undefined ? String(cell) : ''))
                .filter(cell => cell.trim().length > 0)
                .join(' ');
              if (rowText.trim()) {
                textParts.push(rowText);
              }
            }
          }
        }
      }

      return textParts.join('\n');
    } catch (error) {
      logger.error('Error extracting text from Excel:', error);
      return '';
    }
  }

  /**
   * Extract text from PowerPoint files
   */
  async extractTextFromPowerPoint(pptBuffer: Buffer): Promise<string> {
    try {
      const result = await officeParser.parseOfficeAsync(pptBuffer);
      return result.text || '';
    } catch (error) {
      logger.error('Error extracting text from PowerPoint:', error);
      return '';
    }
  }

  /**
   * Extract entities from text (placeholder implementation)
   */
  private async extractEntitiesFromText(text: string, source: string): Promise<ExtractedEntity[]> {
    // TODO: Implement actual entity extraction using NLP service
    // For now, return empty array
    logger.debug(`Entity extraction from text not implemented yet for ${source}`);
    return [];
  }

  /**
   * Check if file type is supported
   */
  isSupportedFileType(contentType: string): boolean {
    return this.supportedTypes.has(contentType);
  }
} 