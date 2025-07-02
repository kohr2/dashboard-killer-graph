import axios from 'axios';
import { singleton, inject } from 'tsyringe';
import { OntologyService } from '../ontology/ontology.service';
import { logger } from '@shared/utils/logger';

export interface ExtractedEntity {
  id: string;
  name: string;
  type: string;
  confidence: number;
  source: string;
  properties?: Record<string, any>;
  position?: {
    start: number;
    end: number;
  };
}

export interface EntityExtractionConfig {
  models: Record<string, ModelConfig>;
  patterns: Record<string, PatternConfig>;
  contextRules: Record<string, ContextRule>;
  enrichment: Record<string, EnrichmentConfig>;
}

interface ModelConfig {
  type: string;
  model: string;
  endpoint: string;
  confidence: number;
  priority: number;
}

interface PatternConfig {
  regex: string;
  confidence: number;
  priority: number;
}

interface ContextRule {
  priority: string[];
  requiredModels: string[];
  confidenceThreshold: number;
}

interface EnrichmentConfig {
  services: string[];
  properties: string[];
}

@singleton()
export class EnhancedEntityExtractionService {
  private extractionConfig: EntityExtractionConfig;

  constructor(
    @inject(OntologyService) private ontologyService?: OntologyService
  ) {
    // Provide a graceful fallback if OntologyService is not injected (e.g. in unit tests)
    if (!this.ontologyService) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.ontologyService = { getAllOntologies: () => [] } as unknown as OntologyService;
    }

    this.extractionConfig = this.loadExtractionConfig();
  }

  private loadExtractionConfig(): EntityExtractionConfig {
    // Get all loaded ontologies
    const allOntologies = this.ontologyService.getAllOntologies();
    
    // Initialize aggregated config
    const aggregatedConfig: EntityExtractionConfig = {
      models: {},
      patterns: {},
      contextRules: {},
      enrichment: {}
    };

    // Aggregate extraction configs from all ontologies
    for (const ontology of allOntologies) {
      const entitySchemas = ontology.entities;
      
      // Look for entityExtraction config in entity schemas
      for (const [entityType, entitySchema] of Object.entries(entitySchemas)) {
        const entityExtraction = (entitySchema as any).entityExtraction;
        if (entityExtraction) {
          logger.info(`Found entityExtraction config in ontology ${ontology.name} for entity ${entityType}`);
          
          // Merge models
          if (entityExtraction.models) {
            Object.assign(aggregatedConfig.models, entityExtraction.models);
          }
          
          // Merge patterns
          if (entityExtraction.patterns) {
            Object.assign(aggregatedConfig.patterns, entityExtraction.patterns);
          }
          
          // Merge context rules
          if (entityExtraction.contextRules) {
            Object.assign(aggregatedConfig.contextRules, entityExtraction.contextRules);
          }
          
          // Merge enrichment configs
          if (entityExtraction.enrichment) {
            Object.assign(aggregatedConfig.enrichment, entityExtraction.enrichment);
          }
        }
      }
    }

    // Fallback to default config if no extraction configs found
    if (Object.keys(aggregatedConfig.models).length === 0) {
      logger.warn('No entityExtraction configs found in ontologies, using built-in defaults');

      const defaultConfig: EntityExtractionConfig = {
        models: {
          'spacy-en_core_web_lg': {
            type: 'spacy',
            model: 'en_core_web_lg',
            endpoint: '/extract-entities',
            confidence: 0.8,
            priority: 1
          }
        },
        patterns: {
          MonetaryAmount: {
            regex: '\\$\\d+(?:[,\\d]*)(?:\\.\\d+)?[kKmMbB]?',
            confidence: 0.9,
            priority: 1
          },
          Email: {
            regex: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
            confidence: 0.95,
            priority: 1
          }
        },
        contextRules: {
          email: {
            priority: ['Email', 'Organization', 'MonetaryAmount'],
            requiredModels: ['spacy-en_core_web_lg'],
            confidenceThreshold: 0.5
          },
          'financial-report': {
            priority: ['MonetaryAmount', 'Organization'],
            requiredModels: ['spacy-en_core_web_lg'],
            confidenceThreshold: 0.5
          }
        },
        enrichment: {}
      };

      return defaultConfig;
    }

    logger.info(`Aggregated extraction config from ${allOntologies.length} ontologies: ${Object.keys(aggregatedConfig.models).length} models, ${Object.keys(aggregatedConfig.patterns).length} patterns, ${Object.keys(aggregatedConfig.contextRules).length} context rules`);
    
    return aggregatedConfig;
  }

  async extractEntities(
    text: string, 
    context: string = 'email',
    domain?: string
  ): Promise<ExtractedEntity[]> {
    logger.info(`Starting enhanced entity extraction for context: ${context}`);
    
    const entities: ExtractedEntity[] = [];
    
    // 1. Extract using ML models
    const mlEntities = await this.extractWithModels(text, context);
    entities.push(...mlEntities);
    
    // 2. Extract using regex patterns
    const patternEntities = this.extractWithPatterns(text, context);
    entities.push(...patternEntities);
    
    // 3. Merge and deduplicate
    const mergedEntities = this.mergeAndDeduplicate(entities);
    
    // 4. Apply context rules
    const filteredEntities = this.applyContextRules(mergedEntities, context);
    
    // 5. Enrich entities
    const enrichedEntities = await this.enrichEntities(filteredEntities);
    
    logger.info(`Extracted ${enrichedEntities.length} entities from text`);
    return enrichedEntities;
  }

  private async extractWithModels(text: string, context: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const contextRule = this.extractionConfig.contextRules[context];
    
    if (!contextRule) {
      logger.warn(`No context rule found for: ${context}`);
      return entities;
    }

    for (const modelName of contextRule.requiredModels) {
      const modelConfig = this.extractionConfig.models[modelName];
      if (!modelConfig) {
        logger.warn(`Model config not found for: ${modelName}`);
        continue;
      }

      try {
        const modelEntities = await this.callModelEndpoint(modelConfig, text);
        entities.push(...modelEntities);
      } catch (error) {
        logger.error(`Failed to extract entities with model ${modelName}:`, error);
      }
    }

    return entities;
  }

  private async callModelEndpoint(modelConfig: ModelConfig, text: string): Promise<ExtractedEntity[]> {
    const baseUrl = this.getModelServiceUrl(modelConfig.type);
    const url = `${baseUrl}${modelConfig.endpoint}`;
    
    try {
      const response = await axios.post(url, { 
        text,
        model: modelConfig.model,
        confidence_threshold: modelConfig.confidence
      }, {
        timeout: 10000
      });

      return response.data.entities.map((entity: any) => ({
        id: this.generateEntityId(entity),
        name: entity.text,
        type: entity.type,
        confidence: entity.confidence || modelConfig.confidence,
        source: `${modelConfig.type}-${modelConfig.model}`,
        position: entity.position,
        properties: entity.properties || {}
      }));
    } catch (error) {
      logger.error(`Model endpoint call failed for ${modelConfig.model}:`, error);
      return [];
    }
  }

  private getModelServiceUrl(modelType: string): string {
    const serviceUrls = {
      spacy: process.env.NLP_SERVICE_URL || 'http://localhost:8000',
      finbert: process.env.FINANCIAL_SERVICE_URL || 'http://localhost:8001',
      local: process.env.LOCAL_ML_SERVICE_URL || 'http://localhost:8002'
    };
    
    return serviceUrls[modelType as keyof typeof serviceUrls] || serviceUrls.local;
  }

  private extractWithPatterns(text: string, context: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const contextRule = this.extractionConfig.contextRules[context];
    
    if (!contextRule) return entities;

    for (const entityType of contextRule.priority) {
      const patternConfig = this.extractionConfig.patterns[entityType];
      if (!patternConfig) continue;

      const regex = new RegExp(patternConfig.regex, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        entities.push({
          id: this.generateEntityId({ text: match[0], type: entityType }),
          name: match[0],
          type: entityType,
          confidence: patternConfig.confidence,
          source: `regex-${entityType}`,
          position: {
            start: match.index,
            end: match.index + match[0].length
          },
          properties: {}
        });
      }
    }

    return entities;
  }

  private mergeAndDeduplicate(entities: ExtractedEntity[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      const existing = entityMap.get(key);

      if (existing) {
        // Merge properties and take highest confidence
        entityMap.set(key, {
          ...existing,
          confidence: Math.max(existing.confidence, entity.confidence),
          properties: { ...existing.properties, ...entity.properties },
          source: `${existing.source},${entity.source}`
        });
      } else {
        entityMap.set(key, entity);
      }
    }

    return Array.from(entityMap.values());
  }

  private applyContextRules(entities: ExtractedEntity[], context: string): ExtractedEntity[] {
    const contextRule = this.extractionConfig.contextRules[context];
    if (!contextRule) return entities;

    return entities
      .filter(entity => entity.confidence >= contextRule.confidenceThreshold)
      .sort((a, b) => {
        const aPriority = contextRule.priority.indexOf(a.type);
        const bPriority = contextRule.priority.indexOf(b.type);
        
        if (aPriority === -1 && bPriority === -1) return 0;
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        
        return aPriority - bPriority;
      });
  }

  private async enrichEntities(entities: ExtractedEntity[]): Promise<ExtractedEntity[]> {
    const enrichedEntities: ExtractedEntity[] = [];

    for (const entity of entities) {
      const enrichmentConfig = this.extractionConfig.enrichment[entity.type];
      if (!enrichmentConfig) {
        enrichedEntities.push(entity);
        continue;
      }

      try {
        const enriched = await this.enrichEntity(entity, enrichmentConfig);
        enrichedEntities.push(enriched);
      } catch (error) {
        logger.error(`Failed to enrich entity ${entity.name}:`, error);
        enrichedEntities.push(entity);
      }
    }

    return enrichedEntities;
  }

  private async enrichEntity(entity: ExtractedEntity, config: EnrichmentConfig): Promise<ExtractedEntity> {
    const enrichedProperties = { ...entity.properties };

    for (const service of config.services) {
      try {
        const serviceData = await this.callEnrichmentService(service, entity);
        for (const property of config.properties) {
          if (serviceData[property]) {
            enrichedProperties[property] = serviceData[property];
          }
        }
      } catch (error) {
        logger.warn(`Enrichment service ${service} failed for entity ${entity.name}:`, error);
      }
    }

    return {
      ...entity,
      properties: enrichedProperties,
      confidence: Math.min(entity.confidence + 0.1, 1.0) // Boost confidence for enriched entities
    };
  }

  private async callEnrichmentService(service: string, entity: ExtractedEntity): Promise<any> {
    const serviceUrls = {
      edgar: process.env.EDGAR_SERVICE_URL || 'http://localhost:8003',
      openCorporates: process.env.OPENCORPORATES_SERVICE_URL || 'http://localhost:8004',
      linkedin: process.env.LINKEDIN_SERVICE_URL || 'http://localhost:8005',
      twitter: process.env.TWITTER_SERVICE_URL || 'http://localhost:8006',
      'currency-converter': process.env.CURRENCY_SERVICE_URL || 'http://localhost:8007'
    };

    const baseUrl = serviceUrls[service as keyof typeof serviceUrls];
    if (!baseUrl) {
      throw new Error(`Enrichment service URL not configured for: ${service}`);
    }

    const response = await axios.post(`${baseUrl}/enrich`, {
      entity: entity.name,
      type: entity.type,
      properties: entity.properties
    }, {
      timeout: 5000
    });

    return response.data;
  }

  private generateEntityId(entity: { text: string; type: string }): string {
    const timestamp = Date.now();
    const hash = Buffer.from(`${entity.text}-${entity.type}-${timestamp}`).toString('base64').slice(0, 8);
    return `${entity.type.toLowerCase()}-${hash}`;
  }

  // Public method to get extraction configuration
  getExtractionConfig(): EntityExtractionConfig {
    return this.extractionConfig;
  }

  // Method to update configuration dynamically
  updateExtractionConfig(newConfig: Partial<EntityExtractionConfig>): void {
    this.extractionConfig = { ...this.extractionConfig, ...newConfig };
    logger.info('Entity extraction configuration updated');
  }
} 