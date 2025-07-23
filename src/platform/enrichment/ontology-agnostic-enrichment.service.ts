import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@shared/utils/logger';

/**
 * Ontology Agnostic Enrichment Service
 * 
 * This service provides a unified interface for enrichment operations
 * that are not tied to specific ontologies. It can work with any entity
 * type and apply enrichment based on configuration rather than hardcoded
 * ontology-specific logic.
 */
export class OntologyAgnosticEnrichmentService implements IEnrichmentService {
  public readonly name = 'ontology-agnostic';
  private services: Map<string, IEnrichmentService> = new Map();

  constructor() {
    // No dependencies needed for this service
  }

  /**
   * Register an enrichment service
   */
  public registerService(service: IEnrichmentService): void {
    this.services.set(service.name, service);
    logger.info(`Registered enrichment service: ${service.name}`);
  }

  /**
   * Enrich an entity using ontology-agnostic logic
   * 
   * @param entity The entity to enrich
   * @returns Promise resolving to enrichment result
   */
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      logger.debug(`Enriching entity ${entity.id} with ontology-agnostic service`);
      
      // For now, return a basic enrichment result
      // This can be extended with more sophisticated logic later
      return {
        success: true,
        data: {
          enrichedBy: this.name,
          timestamp: new Date().toISOString(),
          entityType: entity.type || 'unknown'
        }
      };
    } catch (error) {
      logger.error(`Ontology-agnostic enrichment failed for entity ${entity.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
} 