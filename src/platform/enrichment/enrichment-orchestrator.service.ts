import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@shared/utils/logger';
import { injectable } from 'tsyringe';

/**
 * Simplified Enrichment Orchestrator Service
 * 
 * This service manages enrichment services and applies them to entities
 * based on simple entity type matching.
 */
@injectable()
export class EnrichmentOrchestratorService {
  private readonly services: Map<string, IEnrichmentService> = new Map();

  /**
   * Register an enrichment service
   */
  public register(service: IEnrichmentService): void {
    this.services.set(service.name, service);
    logger.info(`Registered enrichment service: ${service.name}`);
  }

  /**
   * Get all registered services
   */
  public getServices(): IEnrichmentService[] {
    return Array.from(this.services.values());
  }

  /**
   * Get a specific service by name
   */
  public getService(name: string): IEnrichmentService | undefined {
    return this.services.get(name);
  }

  /**
   * Determine which enrichment service to use for an entity
   */
  private getEnrichmentServiceForEntity(entity: GenericEntity): IEnrichmentService | null {
    // Simple mapping based on entity type
    switch (entity.type) {
      case 'Organization':
      case 'Business':
        return this.services.get('EDGAR') || null;
      case 'Person':
        // Could add LinkedIn enrichment here
        return null;
      case 'Error':
      case 'Exception':
      case 'Bug':
      case 'LogEntry':
        return this.services.get('BugBot') || null;
      default:
        // Check if entity has error-related properties
        if (this.hasErrorProperties(entity)) {
          return this.services.get('BugBot') || null;
        }
        return null;
    }
  }

  /**
   * Check if entity has error-related properties
   */
  private hasErrorProperties(entity: GenericEntity): boolean {
    const properties = entity.properties || {};
    const errorKeywords = ['error', 'exception', 'bug', 'fail', 'timeout', 'null', 'memory'];
    
    // Check entity name/label
    const entityText = `${entity.name || ''} ${entity.label || ''}`.toLowerCase();
    if (errorKeywords.some(keyword => entityText.includes(keyword))) {
      return true;
    }
    
    // Check properties
    const propertyValues = Object.values(properties).join(' ').toLowerCase();
    if (errorKeywords.some(keyword => propertyValues.includes(keyword))) {
      return true;
    }
    
    return false;
  }

  /**
   * Enrich an entity using the appropriate service
   */
  public async enrich(entity: GenericEntity): Promise<GenericEntity> {
    const service = this.getEnrichmentServiceForEntity(entity);
    if (!service) {
      return entity; // No enrichment service available
    }

    try {
      const result = await service.enrich(entity);
      
      if (!result.success || !result.data) {
        return entity; // Enrichment failed or no data
      }

      // Merge enrichment data into entity
      return {
        ...entity,
        enrichedData: {
          ...(entity.enrichedData || {}),
          [service.name]: result.data
        }
      };

    } catch (error) {
      logger.error(`Error enriching entity with service '${service.name}':`, error);
      return entity;
    }
  }

  /**
   * Enrich multiple entities
   */
  public async enrichBatch(entities: GenericEntity[]): Promise<GenericEntity[]> {
    const enrichedEntities: GenericEntity[] = [];
    
    for (const entity of entities) {
      const enriched = await this.enrich(entity);
      enrichedEntities.push(enriched);
    }
    
    return enrichedEntities;
  }
}