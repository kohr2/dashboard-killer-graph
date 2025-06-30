import { singleton, inject } from 'tsyringe';
import { ContentProcessingService } from '@platform/processing/content-processing.service';

/**
 * Thin service wrapper that orchestrates email batch ingestion by delegating
 * heavy-lifting to {@link ContentProcessingService}. This avoids putting
 * business logic directly in the demo script layer so it stays testable and
 * reusable.
 */
@singleton()
export class EmailIngestionDemoService {
  constructor(
    @inject(ContentProcessingService)
    private readonly contentProcessingService: ContentProcessingService,
  ) {}

  /**
   * Process a batch of email bodies.
   * @param emails Plain-text email contents.
   */
  public async processEmails(emails: string[]): Promise<void> {
    await this.contentProcessingService.processContentBatch(emails);
  }
} 