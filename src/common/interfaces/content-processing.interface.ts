export interface IContentProcessingService {
  /**
   * Process an array of plain-text contents (e.g. email bodies) and push the
   * results downstream (DB, message bus, etc.).
   */
  processContentBatch(contents: string[]): Promise<void>;
} 