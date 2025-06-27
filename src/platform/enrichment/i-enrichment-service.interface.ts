import { Organization } from '../../ontologies/crm/domain/entities/organization';
import { Person } from '../../ontologies/crm/domain/entities/person';

/**
 * Defines a type for entities that can be processed by the enrichment services.
 * This can be expanded in the future.
 */
export type EnrichableEntity = Organization | Person;

/**
 * Defines the contract for an enrichment service.
 * Each service provides data from a specific source (e.g., EDGAR, Salesforce).
 */
export interface IEnrichmentService {
  /**
   * A unique, human-readable name for the service (e.g., 'EDGAR', 'Salesforce').
   */
  readonly name: string;

  /**
   * Enriches the given entity with additional data.
   * @param entity The entity to enrich.
   * @returns A promise that resolves to a partial entity object containing the new data,
   *          or null if no enrichment could be made.
   */
  enrich(entity: EnrichableEntity): Promise<Partial<EnrichableEntity> | null>;
} 