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
    for (const service of this.services.values()) {
      try {
        const enrichmentData = await service.enrich(entity);

        // Skip if the service could not enrich the entity (null or empty object)
        if (enrichmentData && Object.keys(enrichmentData).length > 0) {
          if (!entity.enrichedData) {
            entity.enrichedData = {};
          }

          // Some services might already return a structure like { enrichedData: { SERVICE: {...} } }
          const dataToMerge =
            'enrichedData' in enrichmentData
              ? (enrichmentData as any).enrichedData
              : { [service.name]: enrichmentData };

          // Merge the new data while preserving existing entries
          entity.enrichedData = {
            ...entity.enrichedData,
            ...dataToMerge,
          };

          // If the enrichment returned top-level metadata, merge it into the entity's metadata as a convenience
          const maybeMetadata =
            (enrichmentData as any).metadata ??
            (dataToMerge[service.name] as any)?.metadata;

          if (maybeMetadata && typeof maybeMetadata === 'object') {
            entity.metadata = {
              ...(entity.metadata ?? {}),
              ...maybeMetadata,
            };
          }

          logger.info(
            `Successfully enriched entity '${entity.id}' with service '${service.name}'.`,
          );
        }
      } catch (error) {
        logger.error(
          `Error during enrichment with service '${service.name}':`,
          error,
        );
      }
    }

    return entity;
  }
}