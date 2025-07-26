import 'reflect-metadata';
import { singleton } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface BuildOptions {
  configPath?: string;
  ontologyName?: string;
  outputDir?: string;
  topEntities?: number;
  topRelationships?: number;
  includeExternal?: boolean;
}

@singleton()
export class OntologyBuildService {
  /**
   * Check if ontology exists and is properly built
   */
  async checkOntologyExists(ontologyName: string): Promise<boolean> {
    try {
      const ontologyDir = path.join(process.cwd(), `ontologies/${ontologyName}`);
      const finalOntologyPath = path.join(ontologyDir, 'ontology.json');
      
      const finalExists = fs.existsSync(finalOntologyPath);
      
      if (!finalExists) {
        logger.warn(`⚠️ Ontology file missing for ${ontologyName}. Final: ${finalExists}`);
        return false;
      }
      
      logger.info(`✅ Ontology file found for ${ontologyName}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error checking ontology ${ontologyName}:`, error);
      return false;
    }
  }

  /**
   * Build ontology using the existing build logic
   * Note: This is a placeholder that checks if ontology exists
   * For full build functionality, use the script directly
   */
  async buildOntology(options: BuildOptions = {}): Promise<void> {
    try {
      if (!options.ontologyName) {
        throw new Error('Please specify ontologyName');
      }

      const exists = await this.checkOntologyExists(options.ontologyName);
      if (!exists) {
        throw new Error(`Ontology ${options.ontologyName} not found or not built. Please run the build script first.`);
      }

      logger.info(`✅ Ontology ${options.ontologyName} is ready for use`);
    } catch (error) {
      logger.error('❌ Error building ontology:', error);
      throw error;
    }
  }

  /**
   * Build ontology by name with default options
   */
  async buildOntologyByName(ontologyName: string, options: Partial<BuildOptions> = {}): Promise<void> {
    return this.buildOntology({
      ontologyName,
      topEntities: 10,
      topRelationships: 10,
      ...options
    });
  }
} 