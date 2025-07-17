import { logger } from '@shared/utils/logger';
import { IEnrichmentService } from './platform/enrichment/i-enrichment-service.interface';
import { OntologyAgnosticEnrichmentService } from './platform/enrichment/ontology-agnostic-enrichment.service';
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
 * Service factory for creating enrichment services dynamically
 */
class EnrichmentServiceFactory {
  private static serviceRegistry: Map<string, any> = new Map();

  /**
   * Register a service constructor
   */
  static registerService(name: string, constructor: any): void {
    this.serviceRegistry.set(name.toLowerCase(), constructor);
  }

  /**
   * Create a service instance
   */
  static createService(name: string, config: Record<string, any>): IEnrichmentService | null {
    const constructor = this.serviceRegistry.get(name.toLowerCase());
    if (!constructor) {
      logger.warn(`Enrichment service '${name}' not registered in factory`);
      return null;
    }

    try {
      return new constructor(config);
    } catch (error) {
      logger.error(`Failed to create enrichment service '${name}':`, error);
      return null;
    }
  }

  /**
   * Get all registered service names
   */
  static getRegisteredServices(): string[] {
    return Array.from(this.serviceRegistry.keys());
  }
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
      services: [
        {
          name: 'edgar',
          type: 'api',
          enabled: true,
          config: {
            userAgent: process.env.SEC_API_USER_AGENT || 'Dashboard Killer Graph Bot 1.0 (contact@example.com)',
            baseUrl: process.env.EDGAR_SERVICE_URL || 'https://api.sec.gov',
            apiKey: process.env.SEC_API_KEY || '',
          },
          timeout: 10000,
          retries: 3,
        }
      ],
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
 * Create enrichment services based on configuration
 */
function createEnrichmentServices(config: EnrichmentConfig): IEnrichmentService[] {
  const services: IEnrichmentService[] = [];

  for (const serviceConfig of config.services) {
    if (!serviceConfig.enabled) {
      continue;
    }

    try {
      const service = EnrichmentServiceFactory.createService(serviceConfig.name, serviceConfig.config);
      if (service) {
        services.push(service);
      }
    } catch (error) {
      logger.error(`Failed to create enrichment service ${serviceConfig.name}:`, error);
    }
  }

  return services;
}

/**
 * Registers all enrichment services based on configuration.
 * This function should be called at the application's entry point.
 * 
 * Enrichment services and rules are configured in config/enrichment.config.json
 * 
 * This approach is truly ontology-agnostic and enrichment-agnostic - 
 * enrichment services are determined by entity type and configuration rules,
 * not ontology definitions, and services are created dynamically from config.
 */
export function registerAllEnrichments(): OntologyAgnosticEnrichmentService {
  logger.debug('Registering ontology-agnostic enrichment services...');

  // Load configuration and create services
  const enrichmentConfig = loadEnrichmentConfig();
  const enrichmentServices = createEnrichmentServices(enrichmentConfig);
  
  // Create ontology-agnostic enrichment service with configured services
  const ontologyAgnosticEnrichment = new OntologyAgnosticEnrichmentService(enrichmentServices);
  
  const enabledServiceNames = enrichmentConfig.services
    .filter(service => service.enabled)
    .map(service => service.name);
  logger.info(`Enrichment services registered: ${enabledServiceNames.join(', ')}`);

  return ontologyAgnosticEnrichment;
}

/**
 * Register a specific enrichment service with the factory
 * This allows external modules to register their own enrichment services
 */
export function registerEnrichmentService(name: string, constructor: any): void {
  EnrichmentServiceFactory.registerService(name, constructor);
  logger.debug(`Registered enrichment service: ${name}`);
}

/**
 * Get all registered enrichment service names
 */
export function getRegisteredEnrichmentServices(): string[] {
  return EnrichmentServiceFactory.getRegisteredServices();
} 