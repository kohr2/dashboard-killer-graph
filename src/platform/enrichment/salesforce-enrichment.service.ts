import type { AxiosInstance } from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@common/utils/logger';

/**
 * Salesforce Enrichment Service
 * Enriches any entity with Salesforce data (ontology-agnostic)
 */
export class SalesforceEnrichmentService implements IEnrichmentService {
  public readonly name = 'Salesforce';
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  /**
   * Enrich any entity with Salesforce data
   */
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      // Mock Salesforce enrichment for now
      const enrichedData = {
        salesforceId: `SF_${entity.id}`,
        accountType: entity.type,
        lastModified: new Date().toISOString(),
        source: 'salesforce'
      };

      return {
        success: true,
        data: enrichedData,
        metadata: {
          service: this.name,
          entityType: entity.type,
          entityId: entity.id
        }
      };
    } catch (error) {
      logger.error(`Salesforce enrichment failed for entity ${entity.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          service: this.name,
          entityType: entity.type,
          entityId: entity.id
        }
      };
    }
  }
}

// Export empty object for backward compatibility
export const OrganizationDTO = {};