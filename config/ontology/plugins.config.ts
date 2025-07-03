import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { corePlugin } from '../../src/platform/ontology/core.plugin';
import * as fs from 'fs';
import * as path from 'path';

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
 * Plugin registry that dynamically discovers and loads ontology plugins.
 */
class PluginRegistry {
  private plugins: Map<string, PluginConfig> = new Map();
  private readonly ontologiesDir = path.join(process.cwd(), 'ontologies');

  constructor() {
    this.initializePlugins();
  }

  /**
   * Initialize plugins by discovering them from the ontologies directory.
   */
  private initializePlugins(): void {
    // Always include core plugin
    this.plugins.set('core', {
      name: 'core',
      enabled: true,
      plugin: corePlugin,
      description: 'Core ontology with fundamental domain-agnostic entities like Communication'
    });

    // Discover ontology plugins dynamically
    this.discoverOntologyPlugins();
  }

  /**
   * Discover ontology plugins from the ontologies directory.
   */
  private discoverOntologyPlugins(): void {
    if (!fs.existsSync(this.ontologiesDir)) {
      console.warn(`Ontologies directory not found: ${this.ontologiesDir}`);
      return;
    }

    const ontologyDirs = fs.readdirSync(this.ontologiesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const ontologyName of ontologyDirs) {
      this.loadOntologyPlugin(ontologyName);
    }
  }

  /**
   * Load a specific ontology plugin.
   */
  private loadOntologyPlugin(ontologyName: string): void {
    const pluginPath = path.join(this.ontologiesDir, ontologyName, `${ontologyName}.plugin.ts`);
    
    if (!fs.existsSync(pluginPath)) {
      console.warn(`Plugin file not found: ${pluginPath}`);
      return;
    }

    try {
      // Dynamic import of the plugin
      const pluginModule = require(pluginPath);
      const pluginExportName = `${ontologyName}Plugin`;
      const plugin = pluginModule[pluginExportName];

      if (!plugin) {
        console.warn(`Plugin export '${pluginExportName}' not found in ${pluginPath}`);
        return;
      }

      // Default configuration - can be overridden by config files
      const defaultConfig: PluginConfig = {
        name: ontologyName,
        enabled: ontologyName === 'crm' || ontologyName === 'financial', // Enable core ontologies by default
        plugin: plugin,
        description: `${ontologyName.charAt(0).toUpperCase() + ontologyName.slice(1)} ontology`
      };

      // Load custom configuration if it exists
      const configPath = path.join(this.ontologiesDir, ontologyName, 'plugin.config.json');
      if (fs.existsSync(configPath)) {
        const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        Object.assign(defaultConfig, customConfig);
      }

      this.plugins.set(ontologyName, defaultConfig);
      console.log(`Loaded plugin: ${ontologyName} (enabled: ${defaultConfig.enabled})`);

    } catch (error) {
      console.error(`Failed to load plugin ${ontologyName}:`, error);
    }
  }

  /**
   * Get all plugin configurations.
   */
  public getAllPlugins(): Map<string, PluginConfig> {
    return this.plugins;
  }

  /**
   * Get enabled plugins for loading into the ontology service.
   */
  public getEnabledPlugins(): OntologyPlugin[] {
    return Array.from(this.plugins.values())
      .filter(config => config.enabled)
      .map(config => config.plugin);
  }

  /**
   * Get plugin configuration summary for debugging/logging.
   */
  public getPluginSummary(): { enabled: string[]; disabled: string[] } {
    const enabled: string[] = [];
    const disabled: string[] = [];

    for (const [name, config] of this.plugins) {
      if (config.enabled) {
        enabled.push(name);
      } else {
        disabled.push(name);
      }
    }

    return { enabled, disabled };
  }

  /**
   * Check if a specific plugin is enabled.
   */
  public isPluginEnabled(pluginName: string): boolean {
    const config = this.plugins.get(pluginName.toLowerCase());
    return config?.enabled ?? false;
  }

  /**
   * Get detailed information about all plugins.
   */
  public getPluginDetails(): PluginConfig[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Enable or disable a plugin.
   */
  public setPluginEnabled(pluginName: string, enabled: boolean): void {
    const config = this.plugins.get(pluginName.toLowerCase());
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Reload plugins (useful for development).
   */
  public reload(): void {
    this.plugins.clear();
    this.initializePlugins();
  }
}

// Create singleton instance
const pluginRegistry = new PluginRegistry();

// Export the same interface as before for backward compatibility
export const getEnabledPlugins = () => pluginRegistry.getEnabledPlugins();
export const getPluginSummary = () => pluginRegistry.getPluginSummary();
export const isPluginEnabled = (pluginName: string) => pluginRegistry.isPluginEnabled(pluginName);
export const getPluginDetails = () => pluginRegistry.getPluginDetails();

// Export the registry for advanced usage
export { pluginRegistry };
