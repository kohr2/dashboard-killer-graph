import { EmailIngestionService } from '../../../../../src/extensions/crm/application/services/email-ingestion.service';
import { EmailProcessingService } from '../../../../../src/extensions/crm/application/services/email-processing.service';

jest.mock('../../../../../src/extensions/crm/application/services/email-processing.service');

describe('EmailIngestionService', () => {
  let ingestionService: EmailIngestionService;
  let mockProcessingService: jest.Mocked<EmailProcessingService>;

  beforeEach(() => {
    mockProcessingService = new (EmailProcessingService as any)();
    mockProcessingService.processEmlFile = jest.fn();
    ingestionService = new EmailIngestionService(mockProcessingService, {} as any);
  });

  it('should call the processing service with the EML file path', async () => {
    const filePath = '/test-emails/01.eml';
    (mockProcessingService.processEmlFile as jest.Mock).mockResolvedValue({ success: true });
    
    await ingestionService.ingestEmail({} as any, filePath);
    
    expect(mockProcessingService.processEmlFile).toHaveBeenCalledWith(filePath);
  });
});
