import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../shared/utils/logger';

/**
 * Registry for managing TypeScript path aliases dynamically.
 * Allows plugins to register their own path aliases during registration.
 */
export class PathAliasRegistry {
  private static instance: PathAliasRegistry;
  private registeredAliases: Map<string, string> = new Map();
  private tsConfigPath: string;

  private constructor() {
    this.tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  }

  public static getInstance(): PathAliasRegistry {
    if (!PathAliasRegistry.instance) {
      PathAliasRegistry.instance = new PathAliasRegistry();
    }
    return PathAliasRegistry.instance;
  }

  /**
   * Register path aliases for a plugin
   * @param pluginName The name of the plugin
   * @param aliases Record of alias to path mappings
   */
  public registerPluginAliases(pluginName: string, aliases: Record<string, string>): void {
    logger.debug(`Registering path aliases for plugin ${pluginName}:`, aliases);

    const pluginDir = path.join(process.cwd(), 'ontologies', pluginName);
    
    for (const [alias, relativePath] of Object.entries(aliases)) {
      const fullPath = path.resolve(pluginDir, relativePath);
      
      // Verify the path exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Path alias target does not exist: ${fullPath} for alias ${alias}`);
        continue;
      }

      // Store the alias mapping
      this.registeredAliases.set(alias, fullPath);
      logger.debug(`Registered alias: ${alias} -> ${fullPath}`);
    }
  }

  /**
   * Get all registered aliases
   */
  public getRegisteredAliases(): Map<string, string> {
    return new Map(this.registeredAliases);
  }

  /**
   * Update tsconfig.json with registered aliases
   * This method can be called to update the TypeScript configuration
   */
  public updateTsConfig(): void {
    if (!fs.existsSync(this.tsConfigPath)) {
      logger.warn(`tsconfig.json not found at ${this.tsConfigPath}`);
      return;
    }

    try {
      const tsConfigContent = fs.readFileSync(this.tsConfigPath, 'utf8');
      const tsConfig = JSON.parse(tsConfigContent);

      // Ensure paths section exists
      if (!tsConfig.compilerOptions) {
        tsConfig.compilerOptions = {};
      }
      if (!tsConfig.compilerOptions.paths) {
        tsConfig.compilerOptions.paths = {};
      }

      // Add registered aliases
      for (const [alias, fullPath] of this.registeredAliases) {
        const relativePath = path.relative(process.cwd(), fullPath);
        tsConfig.compilerOptions.paths[alias] = [relativePath];
      }

      // Write back to tsconfig.json
      fs.writeFileSync(this.tsConfigPath, JSON.stringify(tsConfig, null, 2));
      logger.info(`Updated tsconfig.json with ${this.registeredAliases.size} path aliases`);
    } catch (error) {
      logger.error('Failed to update tsconfig.json:', error);
    }
  }

  /**
   * Clear all registered aliases
   */
  public clear(): void {
    this.registeredAliases.clear();
    logger.debug('Cleared all registered path aliases');
  }

  /**
   * Get aliases for a specific plugin
   */
  public getPluginAliases(pluginName: string): Record<string, string> {
    const pluginAliases: Record<string, string> = {};
    const pluginPrefix = `@${pluginName}`;

    for (const [alias, fullPath] of this.registeredAliases) {
      if (alias.startsWith(pluginPrefix)) {
        pluginAliases[alias] = fullPath;
      }
    }

    return pluginAliases;
  }
} 