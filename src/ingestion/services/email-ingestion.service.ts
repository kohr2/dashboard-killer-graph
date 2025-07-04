import type { IContentProcessingService } from '@common/interfaces/content-processing.interface';

// Removed tsyringe dependency
export class EmailIngestionService {
  constructor(
    private readonly contentProcessingService: IContentProcessingService,
  ) {}

  /**
   * Process a batch of email bodies.
   * @param emails Plain-text email contents.
   */
  public async processEmails(emails: string[]): Promise<void> {
    await this.contentProcessingService.processContentBatch(emails);
  }
} 