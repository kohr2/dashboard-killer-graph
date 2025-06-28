import { singleton } from 'tsyringe';
import { IEnrichmentService, EnrichableEntity } from './i-enrichment-service.interface';
import { logger } from '@shared/utils/logger';

@singleton()
export class SalesforceEnrichmentService implements IEnrichmentService {
  public readonly name = 'Salesforce';

  /**
   * Simulates enriching an entity with data from Salesforce.
   *
   * In a real implementation, this method would connect to the Salesforce API
   * using a library like jsforce. It would search for a corresponding Account
   * or Contact based on an external identifier (like a CIK from EDGAR) or
   * by name.
   *
   * @param entity The entity to enrich.
   * @returns Enriched data or null.
   */
  public async enrich(entity: EnrichableEntity): Promise<Partial<EnrichableEntity> | null> {
    // We only enrich entities that have been identified by a previous service (e.g., EDGAR)
    const externalId = (entity as any).metadata?.cik;

    if (!externalId) {
      return null;
    }

    // Simulate an API call failure for testing purposes
    if (externalId === 'FAIL-TRIGGER') {
      logger.error('Salesforce API error: Simulated failure.');
      return null;
    }

    // Simulate a successful API call
    logger.info(`Querying Salesforce for entity with CIK: ${externalId}`);
    const salesforceData = {
      salesforceId: `SFDC-MOCK-${externalId}`,
      accountStatus: 'Active',
      lastActivityDate: new Date().toISOString(),
    };

    return {
      metadata: {
        ...entity.metadata,
        ...salesforceData,
      },
    };
  }
} 