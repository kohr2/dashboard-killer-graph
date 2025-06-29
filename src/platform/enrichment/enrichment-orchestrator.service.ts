import 'reflect-metadata';
import { singleton, inject } from 'tsyringe';
import { IEnrichmentService, EnrichableEntity } from './i-enrichment-service.interface';
import { logger } from '@shared/utils/logger';
import { OntologyService } from '@platform/ontology/ontology.service';
import { OCreamContactEntity } from '@crm/domain/entities/contact-ontology';

@singleton()
export class EnrichmentOrchestratorService {
  private services: Map<string, IEnrichmentService> = new Map();

  constructor(
    @inject(OntologyService) private ontologyService: OntologyService,
  ) {}

  /**
   * Registers a new enrichment service.
   * @param service The enrichment service to register.
   */
  public register(service: IEnrichmentService): void {
    if (this.services.has(service.name)) {
      logger.warn(
        `Enrichment service '${service.name}' is already registered. Overwriting.`,
      );
    }
    this.services.set(service.name, service);
    logger.info(`Enrichment service '${service.name}' registered.`);
  }

  /**
   * Returns a list of all registered enrichment services.
   * @returns An array of IEnrichmentService.
   */
  public getServices(): IEnrichmentService[] {
    return Array.from(this.services.values());
  }

  /**
   * Sequentially calls registered enrichment services for an entity.
   */
  public async enrich(entity: EnrichableEntity): Promise<EnrichableEntity> {
    const serviceName = this.ontologyService.getEnrichmentServiceName(entity);

    if (!serviceName) {
      logger.debug(
        `No enrichment service found for entity of type '${entity.label}'.`,
        { entityId: entity.id },
      );
      return entity;
    }

    const service = this.services.get(serviceName);

    if (!service) {
      logger.warn(
        `Service '${serviceName}' is configured for '${entity.label}' but not registered.`,
        { entityId: entity.id },
      );
      return entity;
    }

    try {
      const enrichmentData = await service.enrich(entity);
      if (enrichmentData) {
        // Merge the enrichment data back into the original entity
        Object.assign(entity, enrichmentData);

        logger.info(
          `Successfully enriched entity '${entity.id}' with service '${service.name}'.`,
        );
        return entity;
      }
    } catch (error) {
      logger.error(
        `Error during enrichment with service '${service.name}':`,
        error,
      );
    }

    return entity;
  }
} 