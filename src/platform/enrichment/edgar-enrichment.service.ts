import type { AxiosInstance } from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@common/utils/logger';

/**
 * EDGAR Enrichment Service
 * Enriches any entity with SEC EDGAR data (ontology-agnostic)
 */
export class EdgarEnrichmentService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  /**
   * Enrich any entity with EDGAR data
   */
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      // Mock EDGAR enrichment for now
      const enrichedData = {
        cik: `CIK_${entity.id}`,
        entityType: entity.type,
        lastFilingDate: new Date().toISOString(),
        source: 'edgar'
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
      logger.error(`EDGAR enrichment failed for entity ${entity.id}:`, error);
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