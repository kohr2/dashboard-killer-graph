#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { logger } from '../../src/shared/utils/logger';

// Register Handlebars helper to fix HTML encoding in types
Handlebars.registerHelper('replaceType', function(type: string) {
  return type.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
});

/**
 * Ontology Code Generator
 *
 * Reads each `ontology.json` under `ontologies/<domain>/` and generates minimal
 * DTO + Repository stubs into `build/ontologies/<domain>/`.
 *
 * This is **proof-of-concept** scaffolding – refine templates as your domain
 * grows.
 */

const ONTOLOGIES_DIR = path.resolve(__dirname, '../../ontologies');
const BUILD_DIR = path.resolve(__dirname, '../../build/ontologies');
const TEMPLATE_DIR = path.resolve(__dirname, '../../codegen/ontology-templates');

interface EntitySchema {
  name: string;
  properties?: (string | { name: string; type: string })[];
}

interface OntologyProperty {
  type: string;
  description: string;
  required?: boolean;
  validation?: Record<string, any>;
}

interface OntologyEntity {
  description: string;
  parent?: string;
  properties?: Record<string, OntologyProperty>;
  keyProperties?: string[];
  vectorIndex?: boolean;
  enrichment?: {
    service: string;
    properties: string[];
  };
}

interface OntologyRelationship {
  domain: string;
  range: string;
  description?: string;
  properties?: Record<string, OntologyProperty>;
}

interface OntologyConfig {
  name: string;
  version: string;
  description: string;
  entities: Record<string, OntologyEntity>;
  relationships?: Record<string, OntologyRelationship>;
}

interface OntologyGenerator {
  generateEntities(ontology: OntologyConfig): void;
  generateRepositories(ontology: OntologyConfig): void;
  generateServices(ontology: OntologyConfig): void;
  generateDTOs(ontology: OntologyConfig): void;
  updateIndexFiles(ontology: OntologyConfig): void;
}

class OntologyGeneratorImpl implements OntologyGenerator {
  private templatesDir: string;
  private generatedDir: string;
  private configDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', '..', 'codegen', 'ontology-templates');
    this.generatedDir = path.join(__dirname, '..', '..', 'codegen', 'generated');
    this.configDir = path.join(__dirname, '..', '..', 'config', 'ontology');
  }

  /**
   * Load and validate ontology configuration
   */
  private loadOntologyConfig(ontologyName: string): OntologyConfig {
    // Try config/ontology first, then ontologies/
    const configPath = path.join(this.configDir, `${ontologyName}.ontology.json`);
    const ontologiesPath = path.join(__dirname, '..', '..', 'ontologies', ontologyName, 'ontology.json');
    
    let configData: string;
    
    if (fs.existsSync(configPath)) {
      configData = fs.readFileSync(configPath, 'utf8');
    } else if (fs.existsSync(ontologiesPath)) {
      configData = fs.readFileSync(ontologiesPath, 'utf8');
    } else {
      throw new Error(`Ontology config not found: ${configPath} or ${ontologiesPath}`);
    }

    const config = JSON.parse(configData) as OntologyConfig;

    // Basic validation
    if (!config.name || !config.entities) {
      throw new Error(`Invalid ontology config: ${ontologyName}`);
    }

    return config;
  }

  /**
   * Load Handlebars template
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateContent);
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate TypeScript type from JSON type
   */
  private getTypeScriptType(jsonType: string): string {
    switch (jsonType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'datetime': return 'Date';
      case 'array': return 'any[]';
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }

  /**
   * Generate entities from ontology config
   */
  generateEntities(ontology: OntologyConfig): void {
    logger.info(`Generating entities for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('entity');
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase());
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Convert properties to the format expected by the template
      const properties: Record<string, string> = {};
      if (entityConfig.properties) {
        logger.info(`Processing properties for ${entityName}:`, Object.keys(entityConfig.properties));
        for (const [key, prop] of Object.entries(entityConfig.properties)) {
          const tsType = this.getTypeScriptType(prop.type);
          properties[key] = tsType;
          logger.info(`  ${key}: ${prop.type} -> ${tsType}`);
        }
      } else {
        logger.info(`No properties found for ${entityName}`);
      }

      const entityData = {
        entityName,
        properties,
        keyProperties: entityConfig.keyProperties || [],
        vectorIndex: entityConfig.vectorIndex || false,
        enrichment: entityConfig.enrichment
      };

      logger.info(`Entity data for ${entityName}:`, JSON.stringify(entityData, null, 2));

      const generatedCode = template(entityData);
      const outputPath = path.join(ontologyDir, `${entityName}.entity.ts`);
      
      fs.writeFileSync(outputPath, generatedCode);
      logger.info(`Generated entity: ${outputPath}`);
    }
  }

  /**
   * Generate repositories from ontology config
   */
  generateRepositories(ontology: OntologyConfig): void {
    logger.info(`Generating repositories for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('repository');
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase());
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      const entityData = {
        entityName,
        keyProperties: entityConfig.keyProperties || [],
        vectorIndex: entityConfig.vectorIndex || false
      };

      const generatedCode = template(entityData);
      const outputPath = path.join(ontologyDir, `${entityName}.repository.ts`);
      
      fs.writeFileSync(outputPath, generatedCode);
      logger.info(`Generated repository: ${outputPath}`);
    }
  }

  /**
   * Generate services from ontology config
   */
  generateServices(ontology: OntologyConfig): void {
    logger.info(`Generating services for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('service');
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase());
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      const entityData = {
        entityName,
        keyProperties: entityConfig.keyProperties || [],
        vectorIndex: entityConfig.vectorIndex || false
      };

      const generatedCode = template(entityData);
      const outputPath = path.join(ontologyDir, `${entityName}.service.ts`);
      
      fs.writeFileSync(outputPath, generatedCode);
      logger.info(`Generated service: ${outputPath}`);
    }
  }

  /**
   * Generate DTOs from ontology config
   */
  generateDTOs(ontology: OntologyConfig): void {
    logger.info(`Generating DTOs for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('dto');
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase());
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Convert properties to the format expected by the template
      const properties: Record<string, string> = {};
      if (entityConfig.properties) {
        for (const [key, prop] of Object.entries(entityConfig.properties)) {
          properties[key] = this.getTypeScriptType(prop.type);
        }
      }

      const entityData = {
        entityName,
        properties
      };

      const generatedCode = template(entityData);
      const outputPath = path.join(ontologyDir, `${entityName}.dto.ts`);
      
      fs.writeFileSync(outputPath, generatedCode);
      logger.info(`Generated DTO: ${outputPath}`);
    }
  }

  /**
   * Update index files for the ontology
   */
  updateIndexFiles(ontology: OntologyConfig): void {
    logger.info(`Updating index files for ontology: ${ontology.name}`);
    
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase());
    const indexPath = path.join(ontologyDir, 'index.ts');
    
    const exports: string[] = [];
    
    // Export entities
    for (const entityName of Object.keys(ontology.entities)) {
      exports.push(`export * from './${entityName}.entity';`);
      exports.push(`export * from './${entityName}.repository';`);
      exports.push(`export * from './${entityName}.service';`);
      exports.push(`export * from './${entityName}.dto';`);
    }
    
    const indexContent = `/**
 * Generated index file for ${ontology.name} ontology
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

${exports.join('\n')}
`;
    
    fs.writeFileSync(indexPath, indexContent);
    logger.info(`Updated index file: ${indexPath}`);
  }

  /**
   * Generate all code for a single ontology
   */
  generateOntology(ontologyName: string): void {
    try {
      logger.info(`Starting generation for ontology: ${ontologyName}`);
      
      const config = this.loadOntologyConfig(ontologyName);
      
      this.generateEntities(config);
      this.generateRepositories(config);
      this.generateServices(config);
      this.generateDTOs(config);
      this.updateIndexFiles(config);
      
      logger.info(`✅ Completed generation for ontology: ${ontologyName}`);
    } catch (error) {
      logger.error(`❌ Failed to generate ontology ${ontologyName}:`, error);
      throw error;
    }
  }

  /**
   * Generate all ontologies
   */
  generateAllOntologies(): void {
    logger.info('Starting ontology generation for all ontologies...');
    
    const ontologiesDir = path.join(__dirname, '..', '..', 'ontologies');
    const ontologyNames = new Set<string>();
    
    // Get ontologies from config/ontology
    if (fs.existsSync(this.configDir)) {
      const configFiles = fs.readdirSync(this.configDir)
        .filter(file => file.endsWith('.ontology.json'))
        .map(file => file.replace('.ontology.json', ''));
      
      configFiles.forEach(name => ontologyNames.add(name));
    }
    
    // Get ontologies from ontologies/
    if (fs.existsSync(ontologiesDir)) {
      const ontologyDirs = fs.readdirSync(ontologiesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      ontologyDirs.forEach(name => ontologyNames.add(name));
    }
    
    const ontologyList = Array.from(ontologyNames);
    
    if (ontologyList.length === 0) {
      logger.warn('No ontology files found in config or ontologies directories');
      return;
    }
    
    logger.info(`Found ${ontologyList.length} ontology files: ${ontologyList.join(', ')}`);
    
    for (const ontologyName of ontologyList) {
      this.generateOntology(ontologyName);
    }
    
    logger.info('✅ Completed generation for all ontologies');
  }
}

// Main execution
if (require.main === module) {
  const generator = new OntologyGeneratorImpl();
  
  const args = process.argv.slice(2);
  if (args.length > 0) {
    // Generate specific ontology
    generator.generateOntology(args[0]);
  } else {
    // Generate all ontologies
    generator.generateAllOntologies();
  }
}

export { OntologyGeneratorImpl };
export type { OntologyGenerator }; 