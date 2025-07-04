import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@common/utils/logger';

/**
 * Enrichment Orchestrator Service
 * Coordinates multiple enrichment services (ontology-agnostic)
 */
export class EnrichmentOrchestratorService {
  private readonly services: IEnrichmentService[];

  constructor(services: IEnrichmentService[] = []) {
    this.services = services;
  }

  /**
   * Add an enrichment service
   */
  public addService(service: IEnrichmentService): void {
    this.services.push(service);
  }

  /**
   * Enrich an entity using all available services
   */
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];

    for (const service of this.services) {
      try {
        logger.debug(`Enriching entity ${entity.id} with service ${service.name}`);
        const result = await service.enrich(entity);
        results.push(result);
        
        if (result.success) {
          logger.info(`✅ Enriched entity ${entity.id} with ${service.name}`);
        } else {
          logger.warn(`⚠️ Failed to enrich entity ${entity.id} with ${service.name}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`❌ Error enriching entity ${entity.id} with ${service.name}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            service: service.name,
            entityType: entity.type,
            entityId: entity.id
          }
        });
      }
    }

    return results;
  }

  /**
   * Get all available enrichment services
   */
  public getServices(): IEnrichmentService[] {
    return [...this.services];
  }

  /**
   * Get service by name
   */
  public getService(name: string): IEnrichmentService | undefined {
    return this.services.find(service => service.name === name);
  }
}