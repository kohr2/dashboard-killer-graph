import { singleton } from 'tsyringe';
import { IEnrichmentService, EnrichableEntity } from './i-enrichment-service.interface';
import { merge } from 'lodash';
import { logger } from '@shared/utils/logger';

@singleton()
export class EnrichmentOrchestratorService {
  private services: IEnrichmentService[] = [];

  /**
   * Registers an enrichment service to be used in the pipeline.
   * @param service An instance of a class that implements IEnrichmentService.
   */
  public register(service: IEnrichmentService): void {
    this.services.push(service);
    logger.info(`Enrichment service '${service.name}' registered.`);
  }

  /**
   * Returns the list of registered enrichment services.
   */
  public getServices(): IEnrichmentService[] {
    return this.services;
  }

  /**
   * Enriches an entity by running it through the pipeline of registered services.
   * The services are executed in the order they were registered.
   * @param entity The entity to enrich.
   * @returns A promise that resolves to the enriched entity.
   */
  public async enrich(entity: EnrichableEntity): Promise<EnrichableEntity> {
    let enrichedEntity = { ...entity };

    for (const service of this.services) {
      try {
        const result = await service.enrich(enrichedEntity);
        if (result) {
          // Deep merge the results. `merge` from lodash is good for this.
          enrichedEntity = merge(enrichedEntity, result);
        }
      } catch (error) {
        logger.error(`Error during enrichment with service '${service.name}':`, error);
        // Continue with the next service even if one fails
      }
    }
    return enrichedEntity;
  }
} 