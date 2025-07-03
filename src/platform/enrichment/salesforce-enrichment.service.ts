import type { AxiosInstance } from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { OrganizationDTO } from '@generated/crm/Organization.dto';
import { logger } from '@shared/utils/logger';

export class SalesforceEnrichmentService implements IEnrichmentService {
  public readonly name = 'Salesforce';

  // Allow axios to be optionally injected for easier unit testing
  constructor(private axios: AxiosInstance | null = null) {}

  /**
   * Enriches an organization entity with mock Salesforce data.
   * If the entity contains a CIK in its metadata, we simulate that Salesforce
   * can look up the record and return additional account information.
   *
   * @param entity The entity to enrich.
   * @returns Enriched metadata or null if enrichment is not possible.
   */
  public async enrich(entity: OrganizationDTO): Promise<Record<string, any> | null> {
    // We only handle Organization type entities in this mock implementation
    if (entity.label !== 'Organization') {
      return null;
    }

    const metadata: Record<string, any> | undefined = (entity as any).metadata;

    // Must have a CIK to perform the lookup
    const cik: string | undefined = metadata?.cik;

    if (!cik) {
      return null;
    }

    // Simulate a special failure case for tests
    if (cik === 'FAIL-TRIGGER') {
      logger.error('Salesforce API error: simulated failure for CIK FAIL-TRIGGER');
      return null;
    }

    try {
      logger.info(`Querying Salesforce for organization with CIK: ${cik}`);
      // In a real world scenario we would call Salesforce here. In tests we just wait briefly.
      await new Promise(resolve => setTimeout(resolve, 10));

      const newMetadata = {
        ...metadata,
        salesforceId: `SFDC-MOCK-${cik}`,
        accountStatus: 'Active',
      };

      return { metadata: newMetadata };
    } catch (error) {
      logger.error('Salesforce API error:', error);
      return null;
    }
  }
}