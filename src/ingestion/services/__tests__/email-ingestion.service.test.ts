// Unit test for EmailIngestionService
import { EmailIngestionService } from '../email-ingestion.service';
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

  it('passes through an empty array without errors', async () => {
    const mockProcessBatch = jest.fn().mockResolvedValueOnce([]);
    const mockContentProcessingService = {
      processContentBatch: mockProcessBatch,
    } as unknown as ContentProcessingService;

    const service = new EmailIngestionService(mockContentProcessingService);
    await service.processEmails([]);

    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
    expect(mockProcessBatch).toHaveBeenCalledWith([]);
  });

  it('propagates errors thrown by ContentProcessingService', async () => {
    const boom = new Error('boom');
    const mockProcessBatch = jest.fn().mockRejectedValueOnce(boom);
    const mockContentProcessingService = {
      processContentBatch: mockProcessBatch,
    } as unknown as ContentProcessingService;

    const service = new EmailIngestionService(mockContentProcessingService);

    await expect(service.processEmails(['test email'])).rejects.toThrow('boom');
    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
  });
}); 