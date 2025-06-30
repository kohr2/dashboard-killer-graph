import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerCrm } from './ontologies/crm';
import { registerFinancial } from './ontologies/financial';
import { logger } from '@shared/utils/logger';
import {
  EdgarEnrichmentService,
  EnrichmentOrchestratorService,
} from './platform/enrichment';
import { OntologyService } from '@platform/ontology/ontology.service';
import { crmPlugin } from './ontologies/crm/crm.plugin';
import { financialPlugin } from './ontologies/financial/financial.plugin';
// import { registerSecurity } from './ontologies/security';
// import { registerHealthcare } from './ontologies/healthcare';
// import { registerLegal } from './ontologies/legal';
// import { registerRealEstate } from './ontologies/real-estate';

/**
 * Registers all platform services, including ontologies and enrichment pipelines.
 * This function should be called at the application's entry point.
 */
export function registerAllOntologies() {
  logger.info('Registering all ontologies...');

  // Legacy registration of DI providers (will be replaced by plugin mechanism)
  registerCrm();
  registerFinancial();

  // NEW: plugin-based schema loading
  const ontologyService = container.resolve(OntologyService);
  ontologyService.loadFromPlugins([crmPlugin, financialPlugin]);

  // Define a default User-Agent for SEC EDGAR API
  const secApiUserAgent =
    process.env.SEC_API_USER_AGENT || 'My Company My Product me@mycompany.com';
  
  // Register the user agent as a value for DI
  container.register<string>('SEC_API_USER_AGENT', {
    useValue: secApiUserAgent,
  });

  // Register the EdgarEnrichmentService with the container
  container.register<EdgarEnrichmentService>(EdgarEnrichmentService, {
    useClass: EdgarEnrichmentService,
  });

  // Resolve both services from the container
  const enrichmentOrchestrator = container.resolve(EnrichmentOrchestratorService);
  const edgarService = container.resolve(EdgarEnrichmentService);

  // Register Edgar service with the orchestrator
  enrichmentOrchestrator.register(edgarService);
  logger.info('Enrichment services registered.');

  logger.info('All ontologies registered.');
} 