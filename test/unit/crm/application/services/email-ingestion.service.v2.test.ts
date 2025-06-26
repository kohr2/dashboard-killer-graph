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

  it('should call the processing service and return success when an EML path is provided', async () => {
    const filePath = '/test-emails/01.eml';
    (mockProcessingService.processEmlFile as jest.Mock).mockResolvedValue({ success: true });
    
    const result = await ingestionService.ingestEmail({} as any, filePath);
    
    expect(mockProcessingService.processEmlFile).toHaveBeenCalledWith(filePath);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Email processed successfully');
  });

  it('should return a failure message if no EML file path is provided', async () => {
    const result = await ingestionService.ingestEmail({} as any);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Direct email object ingestion not implemented');
    expect(mockProcessingService.processEmlFile).not.toHaveBeenCalled();
  });
});
