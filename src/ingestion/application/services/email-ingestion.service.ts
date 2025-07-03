import { ContentProcessingService } from '@platform/processing/content-processing.service';

// Removed tsyringe dependency
export class EmailIngestionService {
  constructor(
    private readonly contentProcessingService: ContentProcessingService = new ContentProcessingService(),
  ) {}

  /**
   * Process a batch of email bodies.
   * @param emails Plain-text email contents.
   */
  public async processEmails(emails: string[]): Promise<void> {
    await this.contentProcessingService.processContentBatch(emails);
  }
} 