import { registerCrm } from '../ontologies/crm';
import { registerFinancial } from '../ontologies/financial';
import { logger } from '@common/utils/logger';
import { EdgarEnrichmentService } from './platform/enrichment/edgar-enrichment.service';
import { EnrichmentOrchestratorService } from './platform/enrichment/enrichment-orchestrator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { pluginRegistry } from '../config/ontology/plugins.config';
import axios from 'axios';

/**
 * Registers all platform services, including ontologies and enrichment pipelines.
 * This function should be called at the application's entry point.
 * 
 * Plugins are configured in src/config/ontology-plugins.config.ts
 */
export function registerAllOntologies() {
  logger.debug('Registering all ontologies...');

  // Legacy registration of DI providers (will be replaced by plugin mechanism)
  // registerCrm();
  // registerFinancial();
  // Note: procurement and fibo are now handled by the plugin system below

  // NEW: plugin-based schema loading using configuration
  const enabledPlugins = pluginRegistry.getEnabledPlugins();
  const pluginSummary = pluginRegistry.getPluginSummary();
  
  logger.info(`Loading ${enabledPlugins.length} enabled ontology plugins: ${pluginSummary.enabled.join(', ')}`);
  if (pluginSummary.disabled.length > 0) {
    logger.info(`Disabled plugins: ${pluginSummary.disabled.join(', ')}`);
  }
  
  const ontologyService = OntologyService.getInstance();
  // enabledPlugins already contains OntologyPlugin objects, no need to extract
  ontologyService.loadFromPlugins(enabledPlugins);

  const secApiUserAgent = process.env.SEC_API_USER_AGENT || 'My Company My Product me@mycompany.com';

  // Create enrichment orchestrator with empty services array
  const enrichmentOrchestrator = new EnrichmentOrchestratorService();
  
  // Create axios instance for EDGAR service
  const axiosInstance = axios.create({
    headers: {
      'User-Agent': secApiUserAgent
    }
  });
  
  const edgarService = new EdgarEnrichmentService('Dashboard Killer Graph Bot 1.0 (contact@example.com)');

  // Add Edgar service to the orchestrator
  enrichmentOrchestrator.addService(edgarService);
  logger.info('Enrichment services registered.');

  logger.info('All ontologies registered.');
}

/**
 * Registers only the specified ontologies (plus the mandatory `core` ontology).
 * It resets the plugin registry, enables the requested plugins, then loads them via OntologyService.
 */
export function registerSelectedOntologies(ontologyNames: string[]): void {
  logger.debug(`Registering selected ontologies: ${ontologyNames.join(', ')}`);

  // Reload registry to default state, then enable only core + specified names
  pluginRegistry.reload();

  // Normalise names for case-insensitive comparison
  const requested = ontologyNames.map(n => n.toLowerCase());

  for (const { name } of pluginRegistry.getPluginDetails()) {
    const enable = name === 'core' || requested.includes(name.toLowerCase());
    pluginRegistry.setPluginEnabled(name, enable);
  }

  // Finally delegate to the standard loader (which reads the updated registry)
  registerAllOntologies();
} 