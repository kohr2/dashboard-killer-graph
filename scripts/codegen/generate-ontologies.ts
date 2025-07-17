#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { logger } from '@shared/utils/logger';

// Register Handlebars helper to fix HTML encoding in types
Handlebars.registerHelper('replaceType', function(type: string) {
  return type.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
});

// Register Handlebars helper to lookup properties
Handlebars.registerHelper('lookup', function(obj: any, key: string) {
  return obj && obj[key] !== undefined;
});

// Register Handlebars helper to check if key properties exist
Handlebars.registerHelper('hasValidKeyProperties', function(keyProperties: string[], properties: Record<string, any>) {
  return keyProperties.some(key => properties && properties[key] !== undefined);
});

// Register Handlebars helper to extract description text
Handlebars.registerHelper('extractDescription', function(description: any) {
  if (typeof description === 'string') {
    return description;
  }
  if (description && typeof description === 'object') {
    return description._ || description.description || 'No description available';
  }
  return 'No description available';
});

// Register Handlebars helper for pascalCase
Handlebars.registerHelper('pascalCase', function(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

// Register Handlebars helper to convert entity names to valid TypeScript identifiers
Handlebars.registerHelper('toValidIdentifier', function(str: string) {
  // Replace hyphens and other invalid characters with underscores, then convert to PascalCase
  // But preserve the original casing for the first character of each word
  return str
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Preserve original casing
    .join('');
});

/**
 * Ontology Code Generator
 *
 * Reads the new ontology JSON files (source.ontology.json and ontology.json) 
 * under `ontologies/<domain>/` and generates minimal DTO + Repository stubs 
 * into `codegen/generated/<domain>/`.
 *
 * This is **proof-of-concept** scaffolding – refine templates as your domain
 * grows.
 */

const ONTOLOGIES_DIR = path.resolve(__dirname, '../../ontologies');
const GENERATED_DIR = path.resolve(__dirname, '../../codegen/generated');
const TEMPLATE_DIR = path.resolve(__dirname, '../../codegen/ontology-templates');

interface OntologyProperty {
  type: string;
  description: string;
  required?: boolean;
  validation?: Record<string, any>;
}

interface OntologyEntity {
  name: string;
  description: any; // Can be string or object with _ property
  properties?: Record<string, OntologyProperty>;
  keyProperties?: string[];
  vectorIndex?: boolean;
  documentation?: string;
  parentClass?: string;
}

interface OntologyRelationship {
  name: string;
  description: any;
  source: string;
  target: string;
  documentation?: string;
}

interface SourceOntology {
  name: string;
  source: {
    url: string;
    type: string;
    version: string;
    description: string;
  };
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  metadata: {
    sourceUrl: string;
    extractionDate: string;
    sourceVersion: string;
    entityCount: number;
    relationshipCount: number;
  };
  ignoredEntities?: string[];
  ignoredRelationships?: string[];
}

interface FinalOntology {
  name: string;
  source: {
    url: string;
    type: string;
    version: string;
    description: string;
  };
  entities: Record<string, OntologyEntity>;
  relationships: Record<string, OntologyRelationship>;
  metadata: {
    sourceUrl: string;
    extractionDate: string;
    sourceVersion: string;
    entityCount: number;
    relationshipCount: number;
  };
  ignoredEntities?: string[];
  ignoredRelationships?: string[];
}

interface OntologyConfig {
  name: string;
  version: string;
  description: string;
  entities: Record<string, OntologyEntity>;
  relationships?: Record<string, OntologyRelationship>;
  source: any;
  metadata: any;
  ignoredEntities?: string[];
  ignoredRelationships?: string[];
}

interface OntologyGenerator {
  generateEntities(ontology: OntologyConfig): void;
  generateRepositories(ontology: OntologyConfig): void;
  generateServices(ontology: OntologyConfig): void;
  generateDTOs(ontology: OntologyConfig): void;
  generatePlugin(ontology: OntologyConfig): void;
  updateIndexFiles(ontology: OntologyConfig): void;
}

class OntologyGeneratorImpl implements OntologyGenerator {
  private templatesDir: string;
  private generatedDir: string;
  private ontologiesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', '..', 'codegen', 'ontology-templates');
    this.generatedDir = path.join(__dirname, '..', '..', 'codegen', 'generated');
    this.ontologiesDir = path.join(__dirname, '..', '..', 'ontologies');
  }

  /**
   * Create a minimal source ontology if it doesn't exist
   */
  private createMinimalSourceOntology(ontologyName: string, sourcePath: string): SourceOntology {
    const minimalSource: SourceOntology = {
      name: ontologyName,
      source: {
        url: '',
        type: 'manual',
        version: '1.0.0',
        description: `Auto-generated source ontology for ${ontologyName}`
      },
      entities: [],
      relationships: [],
      metadata: {
        sourceUrl: '',
        extractionDate: new Date().toISOString(),
        sourceVersion: '1.0.0',
        entityCount: 0,
        relationshipCount: 0
      },
      ignoredEntities: [],
      ignoredRelationships: []
    };

    // Ensure directory exists
    this.ensureDirectory(path.dirname(sourcePath));
    
    // Write the minimal source ontology
    fs.writeFileSync(sourcePath, JSON.stringify(minimalSource, null, 2));
    logger.info(`Created minimal source ontology: ${sourcePath}`);
    
    return minimalSource;
  }

  /**
   * Load and validate ontology configuration from the new JSON format
   */
  private loadOntologyConfig(ontologyName: string): OntologyConfig {
    const ontologyDir = path.join(this.ontologiesDir, ontologyName);
    const sourcePath = path.join(ontologyDir, 'source.ontology.json');
    const finalPath = path.join(ontologyDir, 'ontology.json');
    
    // Load source ontology (raw extraction)
    let sourceOntology: SourceOntology;
    if (fs.existsSync(sourcePath)) {
      const sourceData = fs.readFileSync(sourcePath, 'utf8');
      sourceOntology = JSON.parse(sourceData) as SourceOntology;
    } else {
      sourceOntology = this.createMinimalSourceOntology(ontologyName, sourcePath);
    }

    // Load final ontology (with overrides)
    let finalOntology: FinalOntology;
    if (fs.existsSync(finalPath)) {
      const finalData = fs.readFileSync(finalPath, 'utf8');
      finalOntology = JSON.parse(finalData) as FinalOntology;
    } else {
      // Create a minimal final ontology based on the source
      finalOntology = {
        name: sourceOntology.name,
        source: {
          url: sourceOntology.source.url,
          type: sourceOntology.source.type,
          version: sourceOntology.source.version,
          description: sourceOntology.source.description
        },
        entities: {},
        relationships: {},
        metadata: sourceOntology.metadata,
        ignoredEntities: sourceOntology.ignoredEntities || [],
        ignoredRelationships: sourceOntology.ignoredRelationships || []
      };
      
      // Write the minimal final ontology
      fs.writeFileSync(finalPath, JSON.stringify(finalOntology, null, 2));
      logger.info(`Created minimal final ontology: ${finalPath}`);
    }

    // Get ignored entities and relationships from source ontology
    const ignoredEntities = sourceOntology.ignoredEntities || [];
    const ignoredRelationships = sourceOntology.ignoredRelationships || [];

    // Filter out ignored entities and invalid entity names
    const isValidEntityName = (name: string) => {
      // Must start with a letter, underscore, or dollar sign
      if (!name || name.length === 0) return false;
      if (/^\d+$/.test(name)) return false;
      if (!/^[a-zA-Z_$]/.test(name)) return false;
      if (!/^[a-zA-Z0-9_$]+$/.test(name)) return false;
      const reservedKeywords = [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
      ];
      if (reservedKeywords.includes(name)) return false;
      return true;
    };

    const filteredEntities: Record<string, OntologyEntity> = {};
    for (const [entityName, entityConfig] of Object.entries(finalOntology.entities)) {
      if (!ignoredEntities.includes(entityName) && isValidEntityName(entityName)) {
        filteredEntities[entityName] = entityConfig;
      } else {
        logger.info(`Skipping entity: ${entityName} (ignored: ${ignoredEntities.includes(entityName)}, invalid name: ${!isValidEntityName(entityName)})`);
      }
    }

    // Filter out ignored relationships
    const filteredRelationships: Record<string, OntologyRelationship> = {};
    if (finalOntology.relationships) {
      for (const [relationshipName, relationshipConfig] of Object.entries(finalOntology.relationships)) {
        if (!ignoredRelationships.includes(relationshipName)) {
          filteredRelationships[relationshipName] = relationshipConfig;
        } else {
          logger.info(`Skipping ignored relationship: ${relationshipName}`);
        }
      }
    }

    // Merge source and final ontologies, with final taking precedence
    const config: OntologyConfig = {
      name: finalOntology.name,
      version: (finalOntology.source && finalOntology.source.version) || sourceOntology.source.version || '1.0.0',
      description: (finalOntology.source && finalOntology.source.description) || sourceOntology.source.description || '',
      entities: filteredEntities,
      relationships: Object.keys(filteredRelationships).length > 0 ? filteredRelationships : undefined,
      source: finalOntology.source || sourceOntology.source,
      metadata: finalOntology.metadata || sourceOntology.metadata,
      ignoredEntities,
      ignoredRelationships
    };

    // Basic validation
    if (!config.name || !config.entities) {
      throw new Error(`Invalid ontology config: ${ontologyName}`);
    }

    logger.info(`Loaded ontology: ${config.name} with ${Object.keys(config.entities).length} entities (${ignoredEntities.length} ignored)`);
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
      case 'float': return 'number';
      default: return 'any';
    }
  }

  /**
   * Extract description text from various formats
   */
  private extractDescriptionText(description: any): string {
    if (typeof description === 'string') {
      return description;
    }
    if (description && typeof description === 'object') {
      return description._ || description.description || 'No description available';
    }
    return 'No description available';
  }

  /**
   * Get all properties for an entity including inherited ones
   */
  private getAllEntityProperties(entityName: string, entityConfig: OntologyEntity, ontology: OntologyConfig): Record<string, string> {
    const properties: Record<string, string> = {};
    
    // Add properties from parent entities (recursive)
    if (entityConfig.parentClass) {
      const parentConfig = ontology.entities[entityConfig.parentClass];
      if (parentConfig) {
        const parentProperties = this.getAllEntityProperties(entityConfig.parentClass, parentConfig, ontology);
        Object.assign(properties, parentProperties);
      }
    }
    
    // Add properties from current entity
    if (entityConfig.properties) {
      const reservedKeys = ['id', 'type', 'label', 'createdAt', 'updatedAt', 'enrichedData'];
      for (const [key, prop] of Object.entries(entityConfig.properties)) {
        if (reservedKeys.includes(key)) continue; // avoid duplicates
        const tsType = this.getTypeScriptType(prop.type);
        properties[key] = tsType;
      }
    }
    
    return properties;
  }

  /**
   * Generate entities from ontology config
   */
  generateEntities(ontology: OntologyConfig): void {
    logger.info(`Generating entities for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('entity');
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase().replace('ontology', ''));
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Get all properties including inherited ones
      const properties = this.getAllEntityProperties(entityName, entityConfig, ontology);
      
      logger.info(`Processing properties for ${entityName}:`, Object.keys(properties));

      const entityData = {
        entityName,
        properties,
        keyProperties: entityConfig.keyProperties || [],
        vectorIndex: entityConfig.vectorIndex || false,
        description: this.extractDescriptionText(entityConfig.description),
        documentation: entityConfig.documentation
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
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase().replace('ontology', ''));
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Get all properties including inherited ones
      const properties = this.getAllEntityProperties(entityName, entityConfig, ontology);
      // Only generate findBy... if all key properties exist
      const keyProperties = (entityConfig.keyProperties || []).filter(key => properties[key] !== undefined);
      const hasAllKeyProperties = keyProperties.length === (entityConfig.keyProperties || []).length && keyProperties.length > 0;
      const entityData = {
        entityName,
        keyProperties: hasAllKeyProperties ? keyProperties : [],
        vectorIndex: entityConfig.vectorIndex || false,
        properties
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
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase().replace('ontology', ''));
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Get all properties including inherited ones
      const properties = this.getAllEntityProperties(entityName, entityConfig, ontology);
      // Only generate findBy... if all key properties exist
      const keyProperties = (entityConfig.keyProperties || []).filter(key => properties[key] !== undefined);
      const hasAllKeyProperties = keyProperties.length === (entityConfig.keyProperties || []).length && keyProperties.length > 0;
      const entityData = {
        entityName,
        keyProperties: hasAllKeyProperties ? keyProperties : [],
        vectorIndex: entityConfig.vectorIndex || false,
        properties
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
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase().replace('ontology', ''));
    this.ensureDirectory(ontologyDir);

    for (const [entityName, entityConfig] of Object.entries(ontology.entities)) {
      // Convert properties to the format expected by the template
      const properties: Record<string, string> = {};
      if (entityConfig.properties) {
        const reservedKeys = ['id', 'type', 'label', 'createdAt', 'updatedAt', 'enrichedData'];
        for (const [key, prop] of Object.entries(entityConfig.properties)) {
          if (reservedKeys.includes(key)) continue;
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
   * Generate plugin from ontology config
   */
  generatePlugin(ontology: OntologyConfig): void {
    logger.info(`Generating plugin for ontology: ${ontology.name}`);
    
    const template = this.loadTemplate('plugin');
    // Write plugin file directly to the ontology directory for automatic discovery
    const ontologyDir = path.join(this.ontologiesDir, ontology.name.toLowerCase().replace('ontology', ''));
    this.ensureDirectory(ontologyDir);

    const pluginData = {
      name: ontology.name.toLowerCase()
    };

    const generatedCode = template(pluginData);
    const outputPath = path.join(ontologyDir, `${ontology.name.toLowerCase()}.plugin.ts`);
    
    fs.writeFileSync(outputPath, generatedCode);
    logger.info(`Generated plugin: ${outputPath}`);
  }

  /**
   * Update index files for the ontology
   */
  updateIndexFiles(ontology: OntologyConfig): void {
    logger.info(`Updating index files for ontology: ${ontology.name}`);
    
    const ontologyDir = path.join(this.generatedDir, ontology.name.toLowerCase().replace('ontology', ''));
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
      this.generatePlugin(config);
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
    
    const ontologyNames = new Set<string>();
    
    // Get ontologies from ontologies/ directory (new structure)
    if (fs.existsSync(this.ontologiesDir)) {
      const ontologyDirs = fs.readdirSync(this.ontologiesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => {
          // Check if the directory has both source.ontology.json and ontology.json
          const sourcePath = path.join(this.ontologiesDir, dirent.name, 'source.ontology.json');
          const finalPath = path.join(this.ontologiesDir, dirent.name, 'ontology.json');
          return fs.existsSync(sourcePath) && fs.existsSync(finalPath);
        })
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