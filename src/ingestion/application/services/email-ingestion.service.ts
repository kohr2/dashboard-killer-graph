import { singleton, inject } from 'tsyringe';
import { ContentProcessingService } from '@platform/processing/content-processing.service';

/**
 * Service wrapper that orchestrates email batch ingestion by delegating
 * heavy-lifting to {@link ContentProcessingService}. This keeps operational
 * logic in the service layer and allows demo/CLI scripts to remain thin.
 */
@singleton()
export class EmailIngestionService {
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