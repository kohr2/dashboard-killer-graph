// Unit test for EmailIngestionService
import { EmailIngestionService } from '@src/ingestion/application/services/email-ingestion.service';
import { ContentProcessingService } from '@platform/processing/content-processing.service';

describe('EmailIngestionService', () => {
  it('delegates batch processing to ContentProcessingService', async () => {
    const mockProcessBatch = jest.fn().mockResolvedValueOnce([]);

    const mockContentProcessingService = {
      processContentBatch: mockProcessBatch,
    } as unknown as ContentProcessingService;

    const service = new EmailIngestionService(mockContentProcessingService);

    const emails = ['Hello world', 'Bonjour le monde'];
    await service.processEmails(emails);

    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
    expect(mockProcessBatch).toHaveBeenCalledWith(emails);
  });
}); 