/**
 * Email Processor with Attachments Integration Tests
 * Tests the integration between EmailProcessor and AttachmentProcessor
 */

import { EmailProcessor, EmailProcessingResult } from '../email-processor';
import { AttachmentProcessor } from '../attachment-processor';
import { EmailAttachment } from '../types/email.interface';
import { logger } from '@shared/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Mock the file system and logger
jest.mock('fs');
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the attachment processor
jest.mock('../attachment-processor');

describe('EmailProcessor with Attachments', () => {
  let emailProcessor: EmailProcessor;
  let mockAttachmentProcessor: jest.Mocked<AttachmentProcessor>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock attachment processor
    mockAttachmentProcessor = {
      processAttachments: jest.fn(),
      extractTextFromPdf: jest.fn(),
      extractTextFromDocx: jest.fn(),
      extractTextFromImage: jest.fn(),
      isSupportedFileType: jest.fn(),
    } as any;

    // Mock the AttachmentProcessor constructor
    (AttachmentProcessor as jest.MockedClass<typeof AttachmentProcessor>).mockImplementation(() => mockAttachmentProcessor);

    emailProcessor = new EmailProcessor();
  });

  describe('processEmlFileWithAttachments', () => {
    it('should process email with PDF attachment and extract content', async () => {
      // Arrange
      const testEmlContent = `From: test@example.com
To: recipient@example.com
Subject: Email with PDF attachment
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is an email with a PDF attachment.

--boundary123
Content-Type: application/pdf; name="report.pdf"
Content-Disposition: attachment; filename="report.pdf"

PDF_CONTENT_HERE
--boundary123--`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);

      // Mock attachment processing result
      mockAttachmentProcessor.processAttachments.mockResolvedValue({
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
            text: '$50,000',
            type: 'MONETARY',
            confidence: 0.9,
            position: { start: 0, end: 7 },
            metadata: { source: 'report.pdf' }
          }],
          processingDuration: 150,
        }],
        extractedEntities: [{
          text: '$50,000',
          type: 'MONETARY',
          confidence: 0.9,
          position: { start: 0, end: 7 },
          metadata: { source: 'report.pdf' }
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
      expect(result.attachmentProcessing?.extractedEntities[0].type).toBe('MONETARY');
      expect(result.entities).toEqual(expect.arrayContaining([
        expect.objectContaining({
          text: '$50,000',
          type: 'MONETARY'
        })
      ]));
    });

    it('should process email with multiple attachments of different types', async () => {
      // Arrange
      const testEmlContent = `From: test@example.com
To: recipient@example.com
Subject: Email with multiple attachments
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

Email with multiple attachments.

--boundary123
Content-Type: application/pdf; name="contract.pdf"
Content-Disposition: attachment; filename="contract.pdf"

PDF_CONTENT
--boundary123
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="proposal.docx"
Content-Disposition: attachment; filename="proposal.docx"

DOCX_CONTENT
--boundary123
Content-Type: image/png; name="chart.png"
Content-Disposition: attachment; filename="chart.png"

PNG_CONTENT
--boundary123--`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);

      mockAttachmentProcessor.processAttachments.mockResolvedValue({
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
      const testEmlContent = `From: test@example.com
To: recipient@example.com
Subject: Simple email without attachments
Content-Type: text/plain

This is a simple email without any attachments.`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);

      mockAttachmentProcessor.processAttachments.mockResolvedValue({
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
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/simple.eml');

      // Assert
      expect(result.success).toBe(true);
      expect(result.attachmentProcessing?.totalProcessed).toBe(0);
      expect(result.attachmentProcessing?.processedAttachments).toHaveLength(0);
      expect(mockAttachmentProcessor.processAttachments).toHaveBeenCalledWith([]);
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      const testEmlContent = `From: test@example.com
To: recipient@example.com
Subject: Email with problematic attachment`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);
      
      // Mock attachment processor to throw an error
      mockAttachmentProcessor.processAttachments.mockRejectedValue(new Error('Attachment processing failed'));

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/problematic.eml');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Attachment processing failed')
      ]));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing attachments'),
        expect.any(Error)
      );
    });

    it('should merge entities from email content and attachments', async () => {
      // Arrange
      const testEmlContent = `From: investor@fund.com
To: portfolio@company.com
Subject: Investment deal analysis
Content-Type: text/plain

Please review the attached deal analysis for TechStart Inc. The proposed investment is $2.5M.`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);

      mockAttachmentProcessor.processAttachments.mockResolvedValue({
        success: true,
        totalProcessed: 1,
        supportedFormats: 1,
        unsupportedFormats: 0,
        processedAttachments: [{
          filename: 'deal-analysis.pdf',
          contentType: 'application/pdf',
          size: 1024,
          supportedFormat: true,
          processingMethod: 'PDF_TEXT_EXTRACTION',
          extractedText: 'Market analysis shows strong potential for TechStart Inc.',
          entities: [{
            text: 'TechStart Inc.',
            type: 'ORGANIZATION',
            confidence: 0.95,
            position: { start: 50, end: 63 },
            metadata: { source: 'deal-analysis.pdf' }
          }],
          processingDuration: 150,
        }],
        extractedEntities: [{
          text: 'TechStart Inc.',
          type: 'ORGANIZATION',
          confidence: 0.95,
          position: { start: 50, end: 63 },
          metadata: { source: 'deal-analysis.pdf' }
        }],
        errors: [],
        totalProcessingTime: 150,
      });

      // Act
      const result = await emailProcessor.processEmlFileWithAttachments('/path/to/investment.eml');

      // Assert
      expect(result.success).toBe(true);
      expect(result.entities).toEqual(expect.arrayContaining([
        expect.objectContaining({
          text: 'TechStart Inc.',
          type: 'ORGANIZATION',
          metadata: expect.objectContaining({
            source: 'deal-analysis.pdf'
          })
        })
      ]));
    });
  });

  describe('integration with existing email processing', () => {
    it('should maintain backward compatibility with existing processEmlFile method', async () => {
      // Arrange
      const testEmlContent = `From: test@example.com
To: recipient@example.com
Subject: Test email
Content-Type: text/plain

Test email content`;

      (fs.readFileSync as jest.Mock).mockReturnValue(testEmlContent);

      // Act
      const result = await emailProcessor.processEmlFile('/path/to/test.eml');

      // Assert
      expect(result.success).toBe(false); // Should be false since it's not fully implemented
      expect(result.email).toBeNull();
      expect(result.entities).toEqual([]);
      expect(result.relationships).toEqual([]);
    });
  });
}); 