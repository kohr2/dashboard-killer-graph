import { logger } from '@shared/utils/logger';
import { registerEnrichmentService } from './register-enrichments';
import * as fs from 'fs';
import * as path from 'path';

interface EnrichmentServiceConfig {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  timeout?: number;
  retries?: number;
}

interface EnrichmentConfig {
  services: EnrichmentServiceConfig[];
  rules: any[];
  global: {
    defaultTimeout: number;
    defaultRetries: number;
    enableLogging: boolean;
    defaults: {
      enabled: boolean;
      priority: number;
    };
  };
}

/**
 * Load enrichment configuration from JSON file
 */
function loadEnrichmentConfig(): EnrichmentConfig {
  const configPath = path.join(__dirname, '../config/enrichment.config.json');
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    logger.warn('Failed to load enrichment config, using defaults');
    return {
      services: [],
      rules: [],
      global: {
        defaultTimeout: 10000,
        defaultRetries: 3,
        enableLogging: true,
        defaults: {
          enabled: false,
          priority: 10
        }
      }
    };
  }
}

/**
 * Create a service instance based on configuration
 * This function creates services entirely from config, without hardcoded constructors
 */
function createServiceFromConfig(serviceConfig: EnrichmentServiceConfig): any {
  try {
    // Create a generic service object based on configuration
    const service = {
      name: serviceConfig.name,
      type: serviceConfig.type,
      config: serviceConfig.config,
      timeout: serviceConfig.timeout,
      retries: serviceConfig.retries,
      
      // Generic enrich method that can be customized via config
      async enrich(entity: any): Promise<any> {
        logger.debug(`Enriching entity with ${this.name} service`);
        
        // Apply service-specific logic based on config
        if (this.config.enrichmentLogic) {
          return this.applyEnrichmentLogic(entity, this.config.enrichmentLogic);
        }
        
        // Default enrichment behavior
        return {
          ...entity,
          enriched: true,
          service: this.name,
          timestamp: new Date().toISOString()
        };
      },
      
      // Apply enrichment logic based on configuration
      applyEnrichmentLogic(entity: any, logic: any): any {
        // This can be extended to support various enrichment patterns
        // based on the configuration
        return {
          ...entity,
          enriched: true,
          service: this.name,
          logic: logic,
          timestamp: new Date().toISOString()
        };
      }
    };
    
    return service;
  } catch (error) {
    logger.error(`Failed to create enrichment service ${serviceConfig.name}:`, error);
    return null;
  }
}

/**
 * Register all available enrichment services with the factory
 * This function reads from the JSON config file and creates services entirely from config
 */
export function registerAvailableEnrichmentServices(): void {
  logger.debug('Registering available enrichment services from config...');

  // Load configuration
  const enrichmentConfig = loadEnrichmentConfig();
  
  // Register services for each configured service
  for (const serviceConfig of enrichmentConfig.services) {
    if (!serviceConfig.enabled) {
      logger.debug(`Skipping disabled service: ${serviceConfig.name}`);
      continue;
    }

    // Register the service with the factory
    registerEnrichmentService(serviceConfig.name, (config: any) => {
      return createServiceFromConfig({
        ...serviceConfig,
        config: { ...serviceConfig.config, ...config }
      });
    });

    logger.debug(`Registered enrichment service from config: ${serviceConfig.name}`);
  }

  const enabledServices = enrichmentConfig.services
    .filter(service => service.enabled)
    .map(service => service.name);
  
  logger.info(`Available enrichment services registered from config: ${enabledServices.join(', ')}`);
} 