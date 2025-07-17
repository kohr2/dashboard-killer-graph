import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@shared/utils/logger';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { injectable } from 'tsyringe';

/**
 * Enrichment Orchestrator Service (back-compat)
 * -------------------------------------------------
 * 1. Legacy tests expect:
 *    • constructor(ontologyService)
 *    • register(service)
 *    • enrich(entity) → merged *entity* (not array)
 * 2. Newer code relies on:
 *    • constructor() with no args
 *    • addService / getService helpers
 */
@injectable()
export class EnrichmentOrchestratorService {
  private readonly services: IEnrichmentService[] = [];
  private readonly ontologyService: OntologyService;

  constructor(param?: OntologyService | IEnrichmentService[]) {
    if (Array.isArray(param)) {
      // Constructor called with service list (new style)
      this.services.push(...param);
      this.ontologyService = container.resolve(OntologyService);
    } else if (param) {
      // Legacy style: first argument is OntologyService
      this.ontologyService = param;
    } else {
      this.ontologyService = container.resolve(OntologyService);
    }
  }

  // Legacy alias
  public register(service: IEnrichmentService): void {
    this.services.push(service);
  }

  // New name (preferred)
  public addService(service: IEnrichmentService): void {
    this.services.push(service);
  }

  public getServices(): IEnrichmentService[] {
    return [...this.services];
  }

  public getService(name: string): IEnrichmentService | undefined {
    return this.services.find((s) => s.name === name);
  }

  /**
   * Enrich the given entity using the service determined by OntologyService.
   * If no service matches, the entity is returned unchanged.
   */
  public async enrich<T extends GenericEntity>(entity: T): Promise<T> {
    const serviceName = this.ontologyService.getEnrichmentServiceName(entity as any);
    if (!serviceName) return entity;

    const service = this.getService(serviceName);
    if (!service) {
      logger.warn(`No enrichment service registered for '${serviceName}'.`);
      return entity;
    }

    try {
      const result = await service.enrich(entity);
      
      // Handle mixed return types from enrichment services
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
        return entity;
      }

      // Check if it's an EnrichmentResult format
      if (typeof result === 'object' && 'success' in result && result.success && 'data' in result) {
        // Merge data under enrichedData.<ServiceName>
        const enrichedDataSection = {
          [service.name]: {
            metadata: result.data,
          },
        };

        return {
          ...entity,
          enrichedData: {
            ...(entity.enrichedData || {}),
            ...enrichedDataSection,
          },
        } as T;
      } else if (typeof result === 'object' && ('id' in result || 'name' in result || 'type' in result)) {
        // It's an enriched entity (legacy format)
        return {
          ...entity,
          ...result,
        } as T;
      }

      return entity;
    } catch (err: any) {
      logger.error(`Error during enrichment with service '${service.name}':`, err.message || err);
      return entity;
    }
  }
}