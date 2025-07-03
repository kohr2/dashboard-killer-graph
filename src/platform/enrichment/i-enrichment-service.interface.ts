import { OrganizationDTO, PersonDTO, ContactDTO } from './dto-aliases';

export type EnrichableEntity = OrganizationDTO | PersonDTO | ContactDTO;

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
   * @returns A promise that resolves to a record containing the enriched data.
   */
  enrich(entity: EnrichableEntity): Promise<Record<string, any> | null>;
} 