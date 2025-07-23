export interface IContentProcessingService {
  /**
   * Process an array of plain-text contents (e.g. email bodies).
   * Implementations may either push results downstream (void) or return them for further processing.
   */
  processContentBatch(contents: string[]): Promise<void | Array<{ entities: unknown[]; relationships: unknown[] }>>;
} 