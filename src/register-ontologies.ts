import { registerCrm } from '../ontologies/crm';
import { registerFinancial } from '../ontologies/financial';
import { logger } from '@shared/utils/logger';
import { EdgarEnrichmentService } from './platform/enrichment/edgar-enrichment.service';
import { EnrichmentOrchestratorService } from './platform/enrichment/enrichment-orchestrator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { getEnabledPlugins, getPluginSummary } from '../config/ontology/plugins.config';

/**
 * Registers all platform services, including ontologies and enrichment pipelines.
 * This function should be called at the application's entry point.
 * 
 * Plugins are configured in src/config/ontology-plugins.config.ts
 */
export function registerAllOntologies() {
  logger.debug('Registering all ontologies...');

  // Legacy registration of DI providers (will be replaced by plugin mechanism)
  registerCrm();
  registerFinancial();

  // NEW: plugin-based schema loading using configuration
  const enabledPlugins = getEnabledPlugins();
  const pluginSummary = getPluginSummary();
  
  logger.info(`Loading ${enabledPlugins.length} enabled ontology plugins: ${pluginSummary.enabled.join(', ')}`);
  if (pluginSummary.disabled.length > 0) {
    logger.info(`Disabled plugins: ${pluginSummary.disabled.join(', ')}`);
  }
  
  const ontologyService = OntologyService.getInstance();
  ontologyService.loadFromPlugins(enabledPlugins);

  const secApiUserAgent = process.env.SEC_API_USER_AGENT || 'My Company My Product me@mycompany.com';

  const enrichmentOrchestrator = new EnrichmentOrchestratorService(ontologyService);
  const edgarService = new EdgarEnrichmentService(secApiUserAgent);

  // Register Edgar service with the orchestrator
  enrichmentOrchestrator.register(edgarService);
  logger.info('Enrichment services registered.');

  logger.info('All ontologies registered.');
} 