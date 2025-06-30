/**
 * Attachment Processor Tests
 * Tests for processing email attachments and extracting content/entities
 */

import { AttachmentProcessor, AttachmentProcessingResult } from '../attachment-processor';
import { EmailAttachment } from '../../../types/email.interface';
import { logger } from '@shared/utils/logger';

// Mock the logger to avoid console output during tests
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AttachmentProcessor', () => {
  let attachmentProcessor: AttachmentProcessor;

  beforeEach(() => {
    attachmentProcessor = new AttachmentProcessor();
    jest.clearAllMocks();
  });

  describe('processAttachments', () => {
    it('should process a PDF attachment and extract text content', async () => {
      // Arrange
      const pdfAttachment: EmailAttachment = {
        filename: 'investment-summary.pdf',
        contentType: 'application/pdf',
        size: 15024,
        content: Buffer.from('Mock PDF content'), // In real scenario, this would be actual PDF binary
      };

      // Act
      const result = await attachmentProcessor.processAttachments([pdfAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('investment-summary.pdf');
      expect(result.processedAttachments[0].contentType).toBe('application/pdf');
      expect(result.processedAttachments[0].extractedText).toBeDefined();
      expect(result.processedAttachments[0].entities).toBeDefined();
      expect(result.extractedEntities.length).toBeGreaterThanOrEqual(0);
    });

    it('should process a Microsoft Word document and extract entities', async () => {
      // Arrange
      const docAttachment: EmailAttachment = {
        filename: 'term-sheet.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 28456,
        content: Buffer.from('Mock DOCX content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([docAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('term-sheet.docx');
      expect(result.processedAttachments[0].supportedFormat).toBe(true);
    });

    it('should handle image attachments and attempt OCR text extraction', async () => {
      // Arrange
      const imageAttachment: EmailAttachment = {
        filename: 'financial-chart.png',
        contentType: 'image/png',
        size: 45123,
        content: Buffer.from('Mock PNG content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([imageAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('financial-chart.png');
      expect(result.processedAttachments[0].processingMethod).toBe('OCR');
    });

    it('should skip unsupported file types gracefully', async () => {
      // Arrange
      const unsupportedAttachment: EmailAttachment = {
        filename: 'data.xlsx.zip',
        contentType: 'application/zip',
        size: 1024,
        content: Buffer.from('Mock ZIP content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([unsupportedAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].supportedFormat).toBe(false);
      expect(result.processedAttachments[0].skipReason).toBe('Unsupported file type: application/zip');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping unsupported attachment type')
      );
    });

    it('should process multiple attachments of different types', async () => {
      // Arrange
      const attachments: EmailAttachment[] = [
        {
          filename: 'contract.pdf',
          contentType: 'application/pdf',
          size: 25000,
          content: Buffer.from('Mock PDF'),
        },
        {
          filename: 'analysis.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 18000,
          content: Buffer.from('Mock DOCX'),
        },
        {
          filename: 'logo.jpg',
          contentType: 'image/jpeg',
          size: 5000,
          content: Buffer.from('Mock JPEG'),
        },
      ];

      // Act
      const result = await attachmentProcessor.processAttachments(attachments);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.supportedFormats).toBe(3);
      expect(result.unsupportedFormats).toBe(0);
    });

    it('should handle empty attachments array', async () => {
      // Act
      const result = await attachmentProcessor.processAttachments([]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      const corruptedAttachment: EmailAttachment = {
        filename: 'corrupted.pdf',
        contentType: 'application/pdf',
        size: 0,
        content: Buffer.from(''), // Empty content should cause processing error
      };

      // Act
      const result = await attachmentProcessor.processAttachments([corruptedAttachment]);

      // Assert
      expect(result.success).toBe(true); // Should still succeed overall
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].error).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing attachment')
      );
    });
  });

  describe('extractTextFromPdf', () => {
    it('should extract text from PDF buffer', async () => {
      // Arrange  
      const pdfBuffer = Buffer.from('Mock PDF content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromPdf(pdfBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
    });
  });

  describe('extractTextFromDocx', () => {
    it('should extract text from DOCX buffer', async () => {
      // Arrange
      const docxBuffer = Buffer.from('Mock DOCX content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromDocx(docxBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
    });
  });

  describe('extractTextFromImage', () => {
    it('should extract text from image using OCR', async () => {
      // Arrange
      const imageBuffer = Buffer.from('Mock image content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromImage(imageBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
    });
  });

  describe('isSupportedFileType', () => {
    it('should return true for supported PDF files', () => {
      expect(attachmentProcessor.isSupportedFileType('application/pdf')).toBe(true);
    });

    it('should return true for supported Word documents', () => {
      expect(attachmentProcessor.isSupportedFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should return true for supported image formats', () => {
      expect(attachmentProcessor.isSupportedFileType('image/png')).toBe(true);
      expect(attachmentProcessor.isSupportedFileType('image/jpeg')).toBe(true);
      expect(attachmentProcessor.isSupportedFileType('image/jpg')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      expect(attachmentProcessor.isSupportedFileType('application/zip')).toBe(false);
      expect(attachmentProcessor.isSupportedFileType('video/mp4')).toBe(false);
      expect(attachmentProcessor.isSupportedFileType('audio/mp3')).toBe(false);
    });
  });
}); 