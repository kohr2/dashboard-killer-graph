/**
 * Tests the integration between EmailProcessor and AttachmentProcessingService
 * Tests email processing with attachment handling capabilities
 */

import { EmailProcessor, EmailProcessingResult } from '../email-processor';
import { AttachmentProcessingService } from '@platform/processing/attachment-processing.service';
import { EmailParsingService } from '@platform/processing/email-parsing.service';
import { EmailAttachment } from '@platform/processing/email-parsing.service';
import { logger } from '@shared/utils/logger';
import * as fs from 'fs';

// Mock the platform services
jest.mock('@platform/processing/email-parsing.service');
jest.mock('@platform/processing/attachment-processing.service');
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EmailProcessor with Attachments', () => {
  let emailProcessor: EmailProcessor;
  let mockEmailParsingService: jest.Mocked<EmailParsingService>;
  let mockAttachmentProcessingService: jest.Mocked<AttachmentProcessingService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock services
    mockEmailParsingService = {
      parseEmlFile: jest.fn(),
      parseEmailContent: jest.fn(),
      extractTextContent: jest.fn(),
    } as any;

    mockAttachmentProcessingService = {
      processAttachments: jest.fn(),
      extractTextFromPdf: jest.fn(),
      extractTextFromDocx: jest.fn(),
      extractTextFromImage: jest.fn(),
      extractTextFromExcel: jest.fn(),
      extractTextFromPowerPoint: jest.fn(),
      isSupportedFileType: jest.fn(),
    } as any;

    // Mock the service constructors
    (EmailParsingService as jest.MockedClass<typeof EmailParsingService>).mockImplementation(() => mockEmailParsingService);
    (AttachmentProcessingService as jest.MockedClass<typeof AttachmentProcessingService>).mockImplementation(() => mockAttachmentProcessingService);

    emailProcessor = new EmailProcessor(mockEmailParsingService, mockAttachmentProcessingService);
  });

  describe('processEmlFileWithAttachments', () => {
    it('should process email with PDF attachment and extract content', async () => {
      // Arrange
      const mockParsedEmail = {
        messageId: 'test-123',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        subject: 'Email with PDF attachment',
        body: 'This is an email with a PDF attachment.',
        date: new Date(),
        headers: {},
        attachments: [{
          filename: 'report.pdf',
          contentType: 'application/pdf',
          size: 1024,
          content: Buffer.from('PDF_CONTENT_HERE'),
        }],
      };

      mockEmailParsingService.parseEmlFile.mockResolvedValue(mockParsedEmail);

      // Mock attachment processing result
      mockAttachmentProcessingService.processAttachments.mockResolvedValue({
        success: true,
        totalProcessed: 1,
        supportedFormats: 1,
        unsupportedFormats: 0,
        processedAttachments: [{
          filename: 'report.pdf',
          contentType: 'application/pdf',
          size: 1024,
          supportedFormat: true,
          processingMethod: 'PDF_TEXT_EXTRACTION',
          extractedText: 'Extracted text from PDF report',
          entities: [{
            id: '1',
            name: '$50,000',
            type: 'MONETARY',
            confidence: 0.9,
            source: 'report.pdf',
            properties: {}
          }],
          processingDuration: 150,
        }],
        extractedEntities: [{
          id: '1',
          name: '$50,000',
          type: 'MONETARY',
          confidence: 0.9,
          source: 'report.pdf',
          properties: {}
        }],
        errors: [],
        totalProcessingTime: 150,
      });

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(true);
      expect(result.email).toBeDefined();
      expect(result.attachmentProcessing).toBeDefined();
      expect(result.attachmentProcessing?.totalProcessed).toBe(1);
      expect(result.attachmentProcessing?.extractedEntities).toHaveLength(1);
      expect(result.entities).toEqual(expect.arrayContaining([
        expect.objectContaining({
          text: '$50,000',
          type: 'MONETARY'
        })
      ]));
    });

    it('should process email with multiple attachments of different types', async () => {
      // Arrange
      const mockParsedEmail = {
        messageId: 'test-456',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        subject: 'Email with multiple attachments',
        body: 'Email with multiple attachments.',
        date: new Date(),
        headers: {},
        attachments: [
          {
            filename: 'contract.pdf',
            contentType: 'application/pdf',
            size: 2048,
            content: Buffer.from('PDF_CONTENT'),
          },
          {
            filename: 'proposal.docx',
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 1536,
            content: Buffer.from('DOCX_CONTENT'),
          },
          {
            filename: 'chart.png',
            contentType: 'image/png',
            size: 512,
            content: Buffer.from('PNG_CONTENT'),
          }
        ],
      };

      mockEmailParsingService.parseEmlFile.mockResolvedValue(mockParsedEmail);

      mockAttachmentProcessingService.processAttachments.mockResolvedValue({
        success: true,
        totalProcessed: 3,
        supportedFormats: 3,
        unsupportedFormats: 0,
        processedAttachments: [
          {
            filename: 'contract.pdf',
            contentType: 'application/pdf',
            size: 2048,
            supportedFormat: true,
            processingMethod: 'PDF_TEXT_EXTRACTION',
            extractedText: 'Contract terms and conditions',
            entities: [],
            processingDuration: 200,
          },
          {
            filename: 'proposal.docx',
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 1536,
            supportedFormat: true,
            processingMethod: 'DOCX_TEXT_EXTRACTION',
            extractedText: 'Business proposal content',
            entities: [],
            processingDuration: 180,
          },
          {
            filename: 'chart.png',
            contentType: 'image/png',
            size: 512,
            supportedFormat: true,
            processingMethod: 'OCR',
            extractedText: 'Chart showing revenue growth',
            entities: [],
            processingDuration: 300,
          }
        ],
        extractedEntities: [],
        errors: [],
        totalProcessingTime: 680,
      });

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(true);
      expect(result.attachmentProcessing?.totalProcessed).toBe(3);
      expect(result.attachmentProcessing?.supportedFormats).toBe(3);
      expect(result.attachmentProcessing?.processedAttachments).toHaveLength(3);
      expect(result.attachmentProcessing?.processedAttachments[0].extractedText).toBe('Contract terms and conditions');
      expect(result.attachmentProcessing?.processedAttachments[1].extractedText).toBe('Business proposal content');
      expect(result.attachmentProcessing?.processedAttachments[2].extractedText).toBe('Chart showing revenue growth');
    });

    it('should handle emails with no attachments', async () => {
      // Arrange
      const mockParsedEmail = {
        messageId: 'test-789',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        subject: 'Simple email without attachments',
        body: 'This is a simple email without any attachments.',
        date: new Date(),
        headers: {},
        attachments: [],
      };

      mockEmailParsingService.parseEmlFile.mockResolvedValue(mockParsedEmail);

      mockAttachmentProcessingService.processAttachments.mockResolvedValue({
        success: true,
        totalProcessed: 0,
        supportedFormats: 0,
        unsupportedFormats: 0,
        processedAttachments: [],
        extractedEntities: [],
        errors: [],
        totalProcessingTime: 0,
      });

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(true);
      expect(result.attachmentProcessing?.totalProcessed).toBe(0);
      expect(result.attachmentProcessing?.processedAttachments).toHaveLength(0);
      expect(mockAttachmentProcessingService.processAttachments).toHaveBeenCalledWith([]);
    });

    it('should handle attachment processing errors gracefully', async () => {
      // Arrange
      const mockParsedEmail = {
        messageId: 'test-error',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        subject: 'Email with problematic attachment',
        body: 'This email has an attachment that will cause an error.',
        date: new Date(),
        headers: {},
        attachments: [{
          filename: 'problematic.pdf',
          contentType: 'application/pdf',
          size: 1024,
          content: Buffer.from('PROBLEMATIC_CONTENT'),
        }],
      };

      mockEmailParsingService.parseEmlFile.mockResolvedValue(mockParsedEmail);
      mockAttachmentProcessingService.processAttachments.mockRejectedValue(new Error('Attachment processing failed'));

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Attachment processing failed');
      expect(result.email).toBeDefined();
      expect(result.entities).toHaveLength(0);
    });

    it('should handle email parsing errors', async () => {
      // Arrange
      mockEmailParsingService.parseEmlFile.mockRejectedValue(new Error('Email parsing failed'));

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email parsing failed');
      expect(result.email).toBeNull();
      expect(result.entities).toHaveLength(0);
    });
  });
}); 