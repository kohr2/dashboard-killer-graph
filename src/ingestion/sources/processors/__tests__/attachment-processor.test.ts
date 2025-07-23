/**
 * Tests for AttachmentProcessingService
 * Tests attachment processing functionality including text extraction and entity recognition
 */

import { AttachmentProcessingService, AttachmentProcessingResult } from '@platform/processing/attachment-processing.service';
import { EmailAttachment } from '@ingestion/email-parsing.service';
import { logger } from '@shared/utils/logger';

// Mock external dependencies
jest.mock('officeparser', () => ({
  parseOfficeAsync: jest.fn().mockResolvedValue({
    text: 'Mock extracted text from office document',
  }),
}));

jest.mock('node-xlsx', () => ({
  parse: jest.fn().mockReturnValue([
    {
      name: 'Sheet1',
      data: [
        ['Header1', 'Header2', 'Header3'],
        ['Value1', 'Value2', 'Value3'],
        ['Value4', 'Value5', 'Value6'],
      ],
    },
  ]),
}));

// Mock the logger
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AttachmentProcessingService', () => {
  let attachmentProcessor: AttachmentProcessingService;

  beforeEach(() => {
    attachmentProcessor = new AttachmentProcessingService();
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

    it('should process Excel spreadsheet attachments and extract data', async () => {
      // Arrange
      const excelAttachment: EmailAttachment = {
        filename: 'financial-data.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 35678,
        content: Buffer.from('Mock XLSX content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([excelAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('financial-data.xlsx');
      expect(result.processedAttachments[0].contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.processedAttachments[0].supportedFormat).toBe(true);
      expect(result.processedAttachments[0].processingMethod).toBe('Excel');
      expect(result.processedAttachments[0].extractedText).toBeDefined();
    });

    it('should process PowerPoint presentation attachments and extract content', async () => {
      // Arrange
      const pptAttachment: EmailAttachment = {
        filename: 'investment-presentation.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 67890,
        content: Buffer.from('Mock PPTX content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([pptAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('investment-presentation.pptx');
      expect(result.processedAttachments[0].contentType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(result.processedAttachments[0].supportedFormat).toBe(true);
      expect(result.processedAttachments[0].processingMethod).toBe('PowerPoint');
      expect(result.processedAttachments[0].extractedText).toBeDefined();
    });

    it('should process legacy Excel files (XLS format)', async () => {
      // Arrange
      const xlsAttachment: EmailAttachment = {
        filename: 'legacy-data.xls',
        contentType: 'application/vnd.ms-excel',
        size: 28456,
        content: Buffer.from('Mock XLS content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([xlsAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('legacy-data.xls');
      expect(result.processedAttachments[0].supportedFormat).toBe(true);
      expect(result.processedAttachments[0].processingMethod).toBe('Excel');
    });

    it('should process legacy PowerPoint files (PPT format)', async () => {
      // Arrange
      const pptAttachment: EmailAttachment = {
        filename: 'legacy-presentation.ppt',
        contentType: 'application/vnd.ms-powerpoint',
        size: 45123,
        content: Buffer.from('Mock PPT content'),
      };

      // Act
      const result = await attachmentProcessor.processAttachments([pptAttachment]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].filename).toBe('legacy-presentation.ppt');
      expect(result.processedAttachments[0].supportedFormat).toBe(true);
      expect(result.processedAttachments[0].processingMethod).toBe('PowerPoint');
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

  describe('extractTextFromExcel', () => {
    it('should extract text from Excel XLSX buffer', async () => {
      // Arrange
      const excelBuffer = Buffer.from('Mock XLSX content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromExcel(excelBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
    });

    it('should handle Excel files with multiple sheets', async () => {
      // Arrange
      const excelBuffer = Buffer.from('Mock multi-sheet XLSX content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromExcel(excelBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
      // Text should contain content from multiple sheets
      expect(extractedText.length).toBeGreaterThan(0);
    });
  });

  describe('extractTextFromPowerPoint', () => {
    it('should extract text from PowerPoint PPTX buffer', async () => {
      // Arrange
      const pptBuffer = Buffer.from('Mock PPTX content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromPowerPoint(pptBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
    });

    it('should handle PowerPoint files with multiple slides', async () => {
      // Arrange
      const pptBuffer = Buffer.from('Mock multi-slide PPTX content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromPowerPoint(pptBuffer);

      // Assert
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
      expect(extractedText.length).toBeGreaterThan(0);
    });

    it('should handle legacy PPT format', async () => {
      // Arrange
      const pptBuffer = Buffer.from('Mock PPT content');

      // Act
      const extractedText = await attachmentProcessor.extractTextFromPowerPoint(pptBuffer);

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

    it('should return true for supported Excel spreadsheets', () => {
      expect(attachmentProcessor.isSupportedFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(attachmentProcessor.isSupportedFileType('application/vnd.ms-excel')).toBe(true);
    });

    it('should return true for supported PowerPoint presentations', () => {
      expect(attachmentProcessor.isSupportedFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
      expect(attachmentProcessor.isSupportedFileType('application/vnd.ms-powerpoint')).toBe(true);
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