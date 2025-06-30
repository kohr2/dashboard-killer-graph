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
  crm: { 
    enabled: true, 
    plugin: crmPlugin,
    description: 'Customer Relationship Management ontology with contacts, organizations, and communications'
  },
  financial: { 
    enabled: true, 
    plugin: financialPlugin,
    description: 'Financial ontology with instruments, institutions, and market data'
  },
  procurement: { 
    enabled: false, 
    plugin: procurementPlugin,
    description: 'Procurement ontology with suppliers, contracts, and purchase orders'
  }
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
  const config = ONTOLOGY_PLUGINS_CONFIG[pluginName.toLowerCase() as keyof typeof ONTOLOGY_PLUGINS_CONFIG];
  return config?.enabled ?? false;
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
      description: config.description
    }));
} 