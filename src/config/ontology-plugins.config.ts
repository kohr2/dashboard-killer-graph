import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { crmPlugin } from '../ontologies/crm/crm.plugin';
import { financialPlugin } from '../ontologies/financial/financial.plugin';
import { procurementPlugin } from '../ontologies/procurement/procurement.plugin';

/**
 * Configuration for ontology plugins.
 * Set enabled: true/false to activate/deactivate plugins.
 */
export interface PluginConfig {
  name: string;
  enabled: boolean;
  plugin: OntologyPlugin;
  description: string;
}

/**
 * Central configuration for all ontology plugins.
 * To enable/disable a plugin, simply change the 'enabled' property.
 */
export const ONTOLOGY_PLUGINS_CONFIG = {
  crm: { enabled: true },        // CRM plugin active
  financial: { enabled: false }, // Financial plugin disabled  
  procurement: { enabled: false } // Procurement plugin active
};

/**
 * Get all enabled plugins for loading into the ontology service.
 */
export function getEnabledPlugins(): OntologyPlugin[] {
  return Object.entries(ONTOLOGY_PLUGINS_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([name, config]) => config.plugin);
}

/**
 * Get plugin configuration summary for debugging/logging.
 */
export function getPluginSummary(): { enabled: string[]; disabled: string[] } {
  const enabled = Object.entries(ONTOLOGY_PLUGINS_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([name, _]) => name);
  
  const disabled = Object.entries(ONTOLOGY_PLUGINS_CONFIG)
    .filter(([_, config]) => !config.enabled)
    .map(([name, _]) => name);
  
  return { enabled, disabled };
}

/**
 * Check if a specific plugin is enabled.
 */
export function isPluginEnabled(pluginName: string): boolean {
  const config = Object.entries(ONTOLOGY_PLUGINS_CONFIG).find(([name, config]) => name.toLowerCase() === pluginName.toLowerCase());
  return config?.[1].enabled ?? false;
}

/**
 * Get detailed information about all plugins.
 */
export function getPluginDetails(): PluginConfig[] {
  return Object.entries(ONTOLOGY_PLUGINS_CONFIG)
    .map(([name, config]) => ({
      name,
      enabled: config.enabled,
      plugin: config.plugin,
      description: '',
      entityCount: Object.keys(config.plugin.entitySchemas || {}).length,
      relationshipCount: Object.keys(config.plugin.relationshipSchemas || {}).length
    })) as any;
} 