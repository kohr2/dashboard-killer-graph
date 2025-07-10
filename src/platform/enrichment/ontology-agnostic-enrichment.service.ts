import { logger } from '@common/utils/logger';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity } from './dto-aliases';
import * as fs from 'fs';
import * as path from 'path';

interface EnrichmentRule {
  entityType: string;
  enrichmentService: string;
  priority: number;
  enabled: boolean;
  conditions?: {
    hasName?: boolean;
    minNameLength?: number;
    [key: string]: any;
  };
}

interface EnrichmentRulesConfig {
  rules: EnrichmentRule[];
  defaults: {
    enabled: boolean;
    priority: number;
  };
}

/**
 * Ontology-agnostic enrichment service that determines which enrichment service to use
 * based on entity type and configuration rules, not ontology definitions.
 */
export class OntologyAgnosticEnrichmentService {
  private rulesConfig: EnrichmentRulesConfig;
  private enrichmentServices: Map<string, IEnrichmentService> = new Map();

  constructor(enrichmentServices: IEnrichmentService[] = []) {
    this.rulesConfig = this.loadEnrichmentRules();
    this.registerServices(enrichmentServices);
  }

  /**
   * Load enrichment rules from configuration file
   */
  private loadEnrichmentRules(): EnrichmentRulesConfig {
    const configPath = path.join(__dirname, '../../../config/enrichment.config.json');
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const fullConfig = JSON.parse(configContent);
      
      // Extract rules and defaults from the merged config
      return {
        rules: fullConfig.rules || [],
        defaults: fullConfig.global?.defaults || {
          enabled: false,
          priority: 10
        }
      };
    } catch (error) {
      logger.warn('Failed to load enrichment config, using defaults');
      return {
        rules: [
          {
            entityType: 'Organization',
            enrichmentService: 'edgar',
            priority: 1,
            enabled: true,
            conditions: {
              hasName: true,
              minNameLength: 2
            }
          }
        ],
        defaults: {
          enabled: false,
          priority: 10
        }
      };
    }
  }

  /**
   * Register enrichment services
   */
  private registerServices(services: IEnrichmentService[]): void {
    for (const service of services) {
      this.enrichmentServices.set(service.name.toLowerCase(), service);
    }
  }

  /**
   * Get the appropriate enrichment service for an entity
   */
  public getEnrichmentService(entity: GenericEntity): IEnrichmentService | null {
    const entityType = this.getEntityType(entity);
    if (!entityType) {
      return null;
    }

    // Find matching rule for this entity type
    const rule = this.findMatchingRule(entityType, entity);
    if (!rule || !rule.enabled) {
      return null;
    }

    // Check if the enrichment service is available
    const service = this.enrichmentServices.get(rule.enrichmentService.toLowerCase());
    if (!service) {
      logger.warn(`Enrichment service '${rule.enrichmentService}' not found for entity type '${entityType}'`);
      return null;
    }

    return service;
  }

  /**
   * Get enrichment service name for an entity (for compatibility)
   */
  public getEnrichmentServiceName(entity: GenericEntity): string | undefined {
    const service = this.getEnrichmentService(entity);
    return service?.name;
  }

  /**
   * Extract entity type from entity
   */
  private getEntityType(entity: GenericEntity): string | null {
    // Try different properties that might contain the entity type
    if ('type' in entity && entity.type) {
      return entity.type;
    }
    if ('label' in entity && entity.label) {
      return entity.label;
    }
    if ('entityType' in entity && entity.entityType) {
      return entity.entityType;
    }
    return null;
  }

  /**
   * Find matching rule for entity type and entity
   */
  private findMatchingRule(entityType: string, entity: GenericEntity): EnrichmentRule | null {
    // Find all rules that match the entity type
    const matchingRules = this.rulesConfig.rules.filter(rule => 
      rule.entityType === entityType && rule.enabled
    );

    if (matchingRules.length === 0) {
      return null;
    }

    // Filter rules based on conditions
    const validRules = matchingRules.filter(rule => this.checkConditions(rule, entity));

    if (validRules.length === 0) {
      return null;
    }

    // Return the rule with highest priority (lowest number)
    return validRules.reduce((best, current) => 
      current.priority < best.priority ? current : best
    );
  }

  /**
   * Check if entity meets the rule conditions
   */
  private checkConditions(rule: EnrichmentRule, entity: GenericEntity): boolean {
    if (!rule.conditions) {
      return true;
    }

    const conditions = rule.conditions;

    // Check if entity has a name
    if (conditions.hasName) {
      const hasName = 'name' in entity && entity.name && entity.name.trim().length > 0;
      if (!hasName) {
        return false;
      }
    }

    // Check minimum name length
    if (conditions.minNameLength && 'name' in entity && entity.name) {
      if (entity.name.length < conditions.minNameLength) {
        return false;
      }
    }

    // Add more condition checks as needed
    return true;
  }

  /**
   * Enrich an entity using the appropriate service
   */
  public async enrich(entity: GenericEntity): Promise<GenericEntity> {
    const service = this.getEnrichmentService(entity);
    if (!service) {
      return entity;
    }

    try {
      const result = await service.enrich(entity);
      
      // Handle different return types
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
        return entity;
      }

      // Check if it's an EnrichmentResult format
      if (typeof result === 'object' && 'success' in result && result.success && 'data' in result) {
        return {
          ...entity,
          enrichedData: {
            ...(entity.enrichedData || {}),
            [service.name]: {
              metadata: result.data,
            },
          },
        } as GenericEntity;
      } else if (typeof result === 'object' && ('id' in result || 'name' in result || 'type' in result)) {
        // It's an enriched entity (legacy format)
        return {
          ...entity,
          ...result,
        } as GenericEntity;
      }

      return entity;
    } catch (error) {
      logger.error(`Error enriching entity with service '${service.name}':`, error);
      return entity;
    }
  }

  /**
   * Get all registered enrichment services
   */
  public getServices(): IEnrichmentService[] {
    return Array.from(this.enrichmentServices.values());
  }

  /**
   * Get a specific enrichment service by name
   */
  public getService(name: string): IEnrichmentService | undefined {
    return this.enrichmentServices.get(name.toLowerCase());
  }
} 