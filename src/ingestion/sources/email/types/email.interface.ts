/**
 * Email-related interfaces for the unified ingestion pipeline
 */

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}

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
  processingDuration?: number;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
  metadata?: Record<string, any>;
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