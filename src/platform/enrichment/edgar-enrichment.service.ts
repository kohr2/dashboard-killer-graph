import type { AxiosInstance } from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@common/utils/logger';
import { container } from 'tsyringe';
import { VectorSearchService } from '@platform/database/vector-search.service';

interface EdgarCompanyHit {
  cik_str: string;
  entityType?: string;
  name?: string;
}

/**
 * EDGAR Enrichment Service
 * Enriches any entity with SEC EDGAR data (ontology-agnostic)
 */
export class EdgarEnrichmentService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  private readonly axiosInstance: AxiosInstance;

  // Simple in-memory cache by normalised company name → enriched payload
  private readonly cache = new Map<string, any>();

  private readonly vectorSearch: VectorSearchService;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
    this.vectorSearch = container.resolve(VectorSearchService);
  }

  /**
   * Enrich any entity with EDGAR data
   */
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      // 0. Vector search reuse (if embedding present)
      if (Array.isArray((entity as any).embedding)) {
        const similar = await this.vectorSearch.findSimilarOrganization((entity as any).embedding as number[], 0.92);
        if (similar && (similar.node as any)?.properties?.cik) {
          return {
            success: true,
            data: {
              cik: (similar.node as any).properties.cik,
              source: 'edgar',
            },
            metadata: {
              service: this.name,
              reused: true,
            }
          } as EnrichmentResult;
        }
      }

      // 1. Normalise name and check cache
      const normName = this.normaliseName(entity.name || '')
      if (!normName) {
        return { success: false, error: 'empty-name' } as EnrichmentResult;
      }
      if (this.cache.has(normName)) {
        return { success: true, data: this.cache.get(normName) } as EnrichmentResult;
      }

      // 2. Call SEC search API
      const url = `https://data.sec.gov/submissions/search-api?keys=${encodeURIComponent(normName)}&category=companies`;
      const resp = await this.axiosInstance.get<EdgarCompanyHit[]>(url, { timeout: 5000 });
      if (!resp.data || (Array.isArray(resp.data) && resp.data.length === 0)) {
        return { success: false, error: 'no-match' } as EnrichmentResult;
      }

      const hit: EdgarCompanyHit = Array.isArray(resp.data) ? resp.data[0] : (resp.data as any);
      if (!hit.cik_str) {
        return { success: false, error: 'no-cik' } as EnrichmentResult;
      }

      const enrichedData = {
        cik: hit.cik_str.padStart(10, '0'),
        entityType: hit.entityType,
        source: 'edgar'
      };

      // Cache for future
      this.cache.set(normName, enrichedData);

      return {
        success: true,
        data: enrichedData,
        metadata: { service: this.name }
      } as EnrichmentResult;

    } catch (error) {
      logger.error(`EDGAR enrichment failed for entity ${entity.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { service: this.name }
      } as EnrichmentResult;
    }
  }

  private normaliseName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(incorporated|inc\.?|corp\.?|corporation|ltd\.?|limited|llc|gmbh|sas|sa|plc|co\.?|spa)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
} 