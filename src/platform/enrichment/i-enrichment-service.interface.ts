import { GenericEntity, EnrichmentResult } from './dto-aliases';

/**
 * Defines the contract for an enrichment service.
 * Each enrichment service (e.g., for SEC EDGAR, Salesforce, etc.)
 * must implement this interface.
 */
export interface IEnrichmentService {
  /**
   * The name of the enrichment service.
   * Used for logging and identification.
   */
  readonly name: string;

  /**
   * Performs the enrichment on the entity.
   *
   * @param entity The entity to enrich.
   * @returns A promise that resolves to:
   *   - EnrichmentResult (new format)
   *   - GenericEntity (enriched entity, legacy format)
   *   - null (no enrichment possible, legacy format)
   *   - {} (empty object for failed enrichment, legacy format)
   */
  enrich(entity: GenericEntity): Promise<EnrichmentResult | GenericEntity | null | {}>;
} 