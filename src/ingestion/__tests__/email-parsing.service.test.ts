import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EmailParsingService, ParsedEmailData, EmailAttachment } from '../email-parsing.service';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { readFileSync } from 'fs';

// Mock dependencies
jest.mock('mailparser');
jest.mock('fs');

const mockedSimpleParser = simpleParser as jest.MockedFunction<typeof simpleParser>;
const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('EmailParsingService', () => {
  let emailParsingService: EmailParsingService;
  let mockParsedMail: Partial<ParsedMail>;

  beforeEach(() => {
    emailParsingService = new EmailParsingService();
    
    // Create mock parsed mail object
    mockParsedMail = {
      messageId: 'test-message-id',
      from: {
        value: [{ address: 'sender@example.com', name: 'Sender Name' }]
      } as AddressObject,
      to: {
        value: [
          { address: 'recipient1@example.com', name: 'Recipient 1' },
          { address: 'recipient2@example.com', name: 'Recipient 2' }
        ]
      } as AddressObject,
      cc: {
        value: [{ address: 'cc@example.com', name: 'CC Recipient' }]
      } as AddressObject,
      bcc: {
        value: [{ address: 'bcc@example.com', name: 'BCC Recipient' }]
      } as AddressObject,
      subject: 'Test Email Subject',
      text: 'This is the plain text body of the email.',
      html: '<p>This is the HTML body of the email.</p>',
      date: new Date('2023-01-01T12:00:00Z'),
      headers: new Map([
        ['from', 'sender@example.com'],
        ['to', 'recipient1@example.com, recipient2@example.com'],
        ['subject', 'Test Email Subject'],
        ['date', 'Sun, 01 Jan 2023 12:00:00 +0000']
      ]),
      attachments: [
        {
          filename: 'test.pdf',
          contentType: 'application/pdf',
          size: 1024,
          content: Buffer.from('test content'),
        }
      ]
    };

    mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);
    mockedReadFileSync.mockReturnValue('mock eml content');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseEmlFile', () => {
    it('should parse EML file successfully', async () => {
      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(mockedReadFileSync).toHaveBeenCalledWith('/path/to/test.eml', 'utf-8');
      expect(mockedSimpleParser).toHaveBeenCalledWith('mock eml content');
      expect(result).toBeDefined();
      expect(result.messageId).toBe('test-message-id');
      expect(result.from).toBe('sender@example.com');
      expect(result.to).toEqual(['recipient1@example.com', 'recipient2@example.com']);
      expect(result.subject).toBe('Test Email Subject');
      expect(result.body).toBe('This is the plain text body of the email.');
      expect(result.htmlBody).toBe('<p>This is the HTML body of the email.</p>');
      expect(result.date).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should handle missing messageId', async () => {
      mockParsedMail.messageId = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.messageId).toMatch(/^generated_\d+$/);
    });

    it('should handle missing from address', async () => {
      mockParsedMail.from = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.from).toBe('unknown@unknown.com');
    });

    it('should handle missing subject', async () => {
      mockParsedMail.subject = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.subject).toBe('(No Subject)');
    });

    it('should handle missing date', async () => {
      mockParsedMail.date = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.date).toBeInstanceOf(Date);
    });

    it('should handle missing text and HTML body', async () => {
      mockParsedMail.text = undefined;
      mockParsedMail.html = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.body).toBe('');
      expect(result.htmlBody).toBeUndefined();
    });

    it('should handle missing attachments', async () => {
      mockParsedMail.attachments = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.attachments).toEqual([]);
    });

    it('should handle attachments with missing properties', async () => {
      mockParsedMail.attachments = [
        {
          filename: undefined,
          contentType: undefined,
          size: undefined,
          content: Buffer.from('test content'),
        }
      ];
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].filename).toBe('attachment');
      expect(result.attachments[0].contentType).toBe('application/octet-stream');
      expect(result.attachments[0].size).toBe(0);
    });

    it('should handle missing headers', async () => {
      mockParsedMail.headers = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.headers).toEqual({});
    });

    it('should handle array headers', async () => {
      mockParsedMail.headers = new Map([
        ['from', ['sender1@example.com', 'sender2@example.com']],
        ['to', 'single@example.com']
      ]);
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/test.eml');

      expect(result.headers.from).toBe('sender1@example.com, sender2@example.com');
      expect(result.headers.to).toBe('single@example.com');
    });
  });

  describe('parseEmailContent', () => {
    it('should parse email content from string', async () => {
      const result = await emailParsingService.parseEmailContent('mock eml content');

      expect(mockedSimpleParser).toHaveBeenCalledWith('mock eml content');
      expect(result).toBeDefined();
      expect(result.messageId).toBe('test-message-id');
    });

    it('should handle missing messageId in content', async () => {
      mockParsedMail.messageId = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmailContent('mock eml content');

      expect(result.messageId).toMatch(/^generated_\d+$/);
    });
  });

  describe('extractTextContent', () => {
    it('should return text body when available', () => {
      const parsedEmail: ParsedEmailData = {
        messageId: 'test',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test',
        body: 'Plain text content',
        htmlBody: '<p>HTML content</p>',
        date: new Date(),
        headers: {},
        attachments: []
      };

      const result = emailParsingService.extractTextContent(parsedEmail);

      expect(result).toBe('Plain text content');
    });

    it('should extract text from HTML when no text body', () => {
      const parsedEmail: ParsedEmailData = {
        messageId: 'test',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test',
        body: '',
        htmlBody: '<p>HTML content with <strong>bold</strong> text</p>',
        date: new Date(),
        headers: {},
        attachments: []
      };

      const result = emailParsingService.extractTextContent(parsedEmail);

      expect(result).toBe('HTML content with bold text');
    });

    it('should return empty string when no content available', () => {
      const parsedEmail: ParsedEmailData = {
        messageId: 'test',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test',
        body: '',
        date: new Date(),
        headers: {},
        attachments: []
      };

      const result = emailParsingService.extractTextContent(parsedEmail);

      expect(result).toBe('');
    });
  });

  describe('convertAddressObject', () => {
    it('should convert single address object', () => {
      const address: AddressObject = {
        value: [{ address: 'test@example.com', name: 'Test User' }]
      };

      const result = (emailParsingService as any).convertAddressObject(address);

      expect(result).toEqual(['test@example.com']);
    });

    it('should convert array of address objects', () => {
      const addresses: AddressObject[] = [
        { value: [{ address: 'user1@example.com', name: 'User 1' }] },
        { value: [{ address: 'user2@example.com', name: 'User 2' }] }
      ];

      const result = (emailParsingService as any).convertAddressObject(addresses);

      expect(result).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should handle undefined address object', () => {
      const result = (emailParsingService as any).convertAddressObject(undefined);

      expect(result).toEqual(['']);
    });

    it('should handle address object with no value', () => {
      const address: AddressObject = { value: undefined };

      const result = (emailParsingService as any).convertAddressObject(address);

      expect(result).toEqual(['']);
    });

    it('should handle address object with empty value array', () => {
      const address: AddressObject = { value: [] };

      const result = (emailParsingService as any).convertAddressObject(address);

      expect(result).toEqual(['']);
    });

    it('should handle address with no address property', () => {
      const address: AddressObject = {
        value: [{ name: 'Test User' }]
      };

      const result = (emailParsingService as any).convertAddressObject(address);

      expect(result).toEqual(['']);
    });

    it('should filter out empty addresses', () => {
      const address: AddressObject = {
        value: [
          { address: 'valid@example.com', name: 'Valid User' },
          { address: '', name: 'Empty Address' },
          { address: 'another@example.com', name: 'Another User' }
        ]
      };

      const result = (emailParsingService as any).convertAddressObject(address);

      expect(result).toEqual(['valid@example.com', 'another@example.com']);
    });
  });

  describe('ParsedEmailData interface', () => {
    it('should validate ParsedEmailData structure', () => {
      const emailData: ParsedEmailData = {
        messageId: 'test-id',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        htmlBody: '<p>Test HTML</p>',
        date: new Date(),
        headers: { 'content-type': 'text/plain' },
        attachments: []
      };

      expect(emailData.messageId).toBe('test-id');
      expect(emailData.from).toBe('sender@example.com');
      expect(emailData.to).toHaveLength(1);
      expect(emailData.cc).toHaveLength(1);
      expect(emailData.bcc).toHaveLength(1);
      expect(emailData.subject).toBe('Test Subject');
      expect(emailData.body).toBe('Test body');
      expect(emailData.htmlBody).toBe('<p>Test HTML</p>');
      expect(emailData.date).toBeInstanceOf(Date);
      expect(emailData.headers).toEqual({ 'content-type': 'text/plain' });
      expect(emailData.attachments).toEqual([]);
    });
  });

  describe('EmailAttachment interface', () => {
    it('should validate EmailAttachment structure', () => {
      const attachment: EmailAttachment = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('test content')
      };

      expect(attachment.filename).toBe('test.pdf');
      expect(attachment.contentType).toBe('application/pdf');
      expect(attachment.size).toBe(1024);
      expect(attachment.content).toBeInstanceOf(Buffer);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex email with multiple recipients', async () => {
      mockParsedMail.to = {
        value: [
          { address: 'primary@example.com', name: 'Primary Recipient' },
          { address: 'secondary@example.com', name: 'Secondary Recipient' },
          { address: 'tertiary@example.com', name: 'Tertiary Recipient' }
        ]
      } as AddressObject;

      mockParsedMail.cc = {
        value: [
          { address: 'cc1@example.com', name: 'CC 1' },
          { address: 'cc2@example.com', name: 'CC 2' }
        ]
      } as AddressObject;

      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/complex.eml');

      expect(result.to).toHaveLength(3);
      expect(result.cc).toHaveLength(2);
      expect(result.to).toContain('primary@example.com');
      expect(result.to).toContain('secondary@example.com');
      expect(result.to).toContain('tertiary@example.com');
      expect(result.cc).toContain('cc1@example.com');
      expect(result.cc).toContain('cc2@example.com');
    });

    it('should handle email with multiple attachments', async () => {
      mockParsedMail.attachments = [
        {
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: 2048,
          content: Buffer.from('pdf content')
        },
        {
          filename: 'image.jpg',
          contentType: 'image/jpeg',
          size: 512,
          content: Buffer.from('image content')
        },
        {
          filename: 'spreadsheet.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 4096,
          content: Buffer.from('excel content')
        }
      ];
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/attachments.eml');

      expect(result.attachments).toHaveLength(3);
      expect(result.attachments[0].filename).toBe('document.pdf');
      expect(result.attachments[0].contentType).toBe('application/pdf');
      expect(result.attachments[0].size).toBe(2048);
      expect(result.attachments[1].filename).toBe('image.jpg');
      expect(result.attachments[1].contentType).toBe('image/jpeg');
      expect(result.attachments[2].filename).toBe('spreadsheet.xlsx');
    });

    it('should handle email with complex HTML content', async () => {
      const complexHtml = `
        <html>
          <head><title>Test Email</title></head>
          <body>
            <h1>Important Notice</h1>
            <p>This is a <strong>very important</strong> email with <em>formatted</em> content.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <div style="color: red;">Red text</div>
          </body>
        </html>
      `;

      mockParsedMail.html = complexHtml;
      mockParsedMail.text = undefined;
      mockedSimpleParser.mockResolvedValue(mockParsedMail as ParsedMail);

      const result = await emailParsingService.parseEmlFile('/path/to/html.eml');
      const extractedText = emailParsingService.extractTextContent(result);

      expect(result.htmlBody).toBe(complexHtml);
      expect(result.body).toBe('');
      expect(extractedText).toContain('Important Notice');
      expect(extractedText).toContain('very important');
      expect(extractedText).toContain('formatted');
      expect(extractedText).toContain('Item 1');
      expect(extractedText).toContain('Item 2');
      expect(extractedText).toContain('Red text');
    });
  });
}); 