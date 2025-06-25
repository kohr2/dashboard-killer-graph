import { EmailIngestionService, IncomingEmail } from '../../../../../src/crm-core/application/services/email-ingestion.service';
import { ContactRepository } from '../../../../../src/crm-core/domain/repositories/i-contact-repository';
import { EmailProcessingService } from '../../../../../src/crm-core/application/services/email-processing.service';
import * as tmp from 'tmp';
import * as fs from 'fs/promises';
import { promisify } from 'util';

jest.mock('../../../../../src/crm-core/application/services/email-processing.service');

describe('EmailIngestionService V2', () => {
  let emailIngestionService: EmailIngestionService;
  let mockEmailProcessingService: jest.Mocked<EmailProcessingService>;
  let mockContactRepository: jest.Mocked<ContactRepository>;

  beforeEach(() => {
    mockContactRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findByEmail: jest.fn(),
    } as any;

    // Use the mocked constructor
    mockEmailProcessingService = new (EmailProcessingService as any)(null);
    mockEmailProcessingService.processEmlFile = jest.fn();

    emailIngestionService = new EmailIngestionService(
      mockEmailProcessingService,
      mockContactRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(emailIngestionService).toBeDefined();
  });

  describe('ingestEmail', () => {
    it('should call the email processing service with a temporary eml file', async () => {
      const email: IncomingEmail = {
        messageId: 'test-id',
        from: 'sender@test.com',
        to: ['receiver@test.com'],
        subject: 'Test Subject',
        body: 'Test Body',
        receivedAt: new Date(),
        headers: {},
      };

      const tmpFile = await promisify(tmp.file)({ postfix: '.eml' });
      const emailContent = `From: ${email.from}\nTo: ${email.to.join(', ')}\nSubject: ${email.subject}\n\n${email.body}`;
      await fs.writeFile(tmpFile, emailContent);

      (mockEmailProcessingService.processEmlFile as jest.Mock).mockResolvedValue({ success: true });

      await emailIngestionService.ingestEmail(email, tmpFile);

      expect(mockEmailProcessingService.processEmlFile).toHaveBeenCalledWith(tmpFile);
      
      await fs.unlink(tmpFile);
    });
  });
});
