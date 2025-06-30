import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { injectable } from 'tsyringe';
import { z } from 'zod';
import { logger } from '@shared/utils/logger';
import { EnrichableEntity } from '@platform/enrichment';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';

// Zod Schemas for validation
const OntologyPropertySchema = z.object({
  type: z.string(),
  description: z.string(),
});

const OntologyEntitySchema = z.object({
  description: z.string().optional(),
  values: z.array(z.string()).optional(),
  parent: z.string().optional(),
  isProperty: z.boolean().optional(),
  properties: z.record(z.union([z.string(), OntologyPropertySchema])).optional(),
  keyProperties: z.array(z.string()).optional(),
  enrichment: z
    .object({
      service: z.string(),
    })
    .optional(),
});

const OntologyRelationshipSchema = z.object({
  domain: z.union([z.string(), z.array(z.string())]),
  range: z.union([z.string(), z.array(z.string())]),
  description: z.string().optional(),
});

const OntologySchemaValidator = z.object({
  name: z.string(),
  entities: z.record(OntologyEntitySchema),
  relationships: z.record(OntologyRelationshipSchema).optional(),
});

// TypeScript types inferred from Zod schemas
export type Ontology = z.infer<typeof OntologySchemaValidator>;
export type EntityFactory<T> = (data: unknown) => T;

interface OntologySource {
  sourcePath: string;
  ontology: Ontology;
}

// Keep a simplified internal schema structure
interface InternalOntologyEntity {
    parent?: string;
    description?: string;
    keyProperties?: string[];
    properties?: { [key: string]: { type: string; description: string; } };
    enrichment?: { service: string };
}

interface InternalOntologyRelationship {
    domain: string | string[];
    range: string | string[];
    description?: string;
}

interface InternalOntologySchema {
    entities: { [key: string]: InternalOntologyEntity };
    relationships: { [key: string]: InternalOntologyRelationship };
}

@injectable()
export class OntologyService {
  private static instanceCounter = 0;
  private instanceId: number;
  private ontologies: Ontology[] = [];
  private entityFactories = new Map<string, EntityFactory<any>>();
  private labelCache = new Map<string, string>();
  private registeredEntityTypes: Set<string> = new Set();
  private entityCreationMap: Map<string, (data: unknown) => any> = new Map();
  private schema: InternalOntologySchema = { entities: {}, relationships: {} };

  public constructor() {
    // DISABLED: File-based loading is now handled by the plugin system to prevent duplicates
    // this.loadOntologies();
    this.instanceId = ++OntologyService.instanceCounter;
    logger.debug(`OntologyService constructor called - Instance #${this.instanceId}`);
  }

  public getInstanceId(): number {
    return this.instanceId;
  }

  /**
   * Loads ontologies directly from an array of objects.
   * Useful for testing without relying on file system discovery.
   * This will clear any previously loaded ontologies.
   * @param ontologyObjects An array of ontology objects to load.
   */
  public loadFromObjects(ontologyObjects: Ontology[]) {
    logger.debug(`Loading ${ontologyObjects.length} ontology objects...`);
    this.ontologies = [];
    this.registeredEntityTypes.clear();
    this.schema = { entities: {}, relationships: {} };

    for (const ontology of ontologyObjects) {
      try {
        // Validate each object against the schema
        const validatedOntology = OntologySchemaValidator.parse(ontology);
        
        this.ontologies.push(validatedOntology);
        if (validatedOntology.entities) {
            Object.assign(this.schema.entities, validatedOntology.entities);
            Object.keys(validatedOntology.entities).forEach(name => {
              this.registeredEntityTypes.add(name);
            });
        }
        if (validatedOntology.relationships) {
            Object.assign(this.schema.relationships, validatedOntology.relationships);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error(`Validation failed for ontology object '${ontology.name}':`, JSON.stringify(error.errors));
        } else {
          logger.error(`An unexpected error occurred while loading ontology object '${ontology.name}':`, error);
        }
      }
    }
    
    logger.info(`Loaded ${Object.keys(this.schema.entities).length} entities and ${Object.keys(this.schema.relationships).length} relationships from ${ontologyObjects.length} ontology plugins`);
  }

  private loadOntologies() {
    const workspaceRoot = path.join(__dirname, '../../..'); // Adjust based on your project structure
    const ontologyFiles = glob.sync('src/ontologies/**/ontology.json', { cwd: workspaceRoot });

    for (const file of ontologyFiles) {
        const filePath = path.join(workspaceRoot, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const ontologyData = JSON.parse(content);

            // Validate the parsed JSON with Zod
            const ontology = OntologySchemaValidator.parse(ontologyData);

            if (ontology.entities) {
                Object.assign(this.schema.entities, ontology.entities);
                Object.keys(ontology.entities).forEach(name => this.registeredEntityTypes.add(name));
            }
            if (ontology.relationships) {
                Object.assign(this.schema.relationships, ontology.relationships);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
              logger.error(`[Ontology Validation Error] Failed to validate ${file}:`, JSON.stringify(error.errors));
            } else {
              logger.error(`Error loading or parsing ontology file ${file}:`, error);
            }
        }
    }
    logger.info(`✅ Loaded and validated ${ontologyFiles.length} ontology schemas.`);
  }

  public getOntologies(): Ontology[] {
    return this.ontologies;
  }

  public registerEntityType<T>(typeName: string, factory: EntityFactory<T>) {
    if (this.entityFactories.has(typeName)) {
      logger.warn(
        `Entity type "${typeName}" is already registered. Overwriting.`,
      );
    }
    this.entityFactories.set(typeName, factory);
    logger.info(`Entity type "${typeName}" registered.`);
  }

  public createEntity<T>(typeName: string, data: unknown): T {
    const factory = this.entityFactories.get(typeName);
    if (!factory) {
      throw new Error(`Entity type "${typeName}" is not registered.`);
    }
    return factory(data) as T;
  }

  public getEntityDefinition(entityName: string) {
    for (const ontology of this.ontologies) {
      if (ontology.entities[entityName]) {
        return ontology.entities[entityName];
      }
    }
    return undefined;
  }

  public getAllEntityTypes(): string[] {
    return Array.from(this.registeredEntityTypes);
  }

  public getKeyProperties(entityType: string): string[] | undefined {
    return this.schema.entities[entityType]?.keyProperties;
  }

  public getPropertyEntityTypes(): string[] {
    const propertyTypes = new Set<string>();
    for (const ontology of this.ontologies) {
      for (const entityName in ontology.entities) {
        if (ontology.entities[entityName].isProperty) {
          propertyTypes.add(entityName);
        }
      }
    }
    return Array.from(propertyTypes);
  }

  public isValidLabel(label: string): boolean {
    return this.getAllNodeLabels().includes(label);
  }

  public getAllNodeLabels(): string[] {
    const labels = new Set<string>();
    for (const ontology of this.ontologies) {
      if (ontology.entities) {
        Object.keys(ontology.entities).forEach(label => labels.add(label));
      }
    }
    return Array.from(labels);
  }

  public isValidRelationshipType(type: string): boolean {
    return this.getAllRelationshipTypes().includes(type);
  }
  
  public getAllRelationshipTypes(): string[] {
    const types = new Set<string>();
    for (const ontology of this.ontologies) {
      if (ontology.relationships) {
        Object.keys(ontology.relationships).forEach(type => types.add(type));
      }
    }
    return Array.from(types);
  }

  public getLabelsForEntityType(entityName: string): string {
    // This is a simplified implementation. In a real scenario, you'd traverse the parent chain.
    const entity = this.schema.entities[entityName];
    if (entity && entity.parent) {
        return `${entityName}:${entity.parent}`;
    }
    return entityName;
  }

  public getSchemaRepresentation(): string {
    logger.debug(`Generating schema representation - Entities: ${Object.keys(this.schema.entities).length}, Relationships: ${Object.keys(this.schema.relationships).length}`);
    
    let schemaText = 'The graph schema is as follows:\n\n';

    schemaText += '## Entities:\n';
    for (const [name, entity] of Object.entries(this.schema.entities)) {
        schemaText += `- ${name}`;
        if (entity.parent) {
            schemaText += ` (is a type of ${entity.parent})`;
        }
        if(entity.description) {
            schemaText += `: ${entity.description}`;
        }
        schemaText += '\n';

        if (entity.properties) {
            schemaText += '    Properties:\n';
            for (const [propName, propDef] of Object.entries(entity.properties)) {
                schemaText += `    - ${propName} (${propDef.type}): ${propDef.description}\n`;
            }
        }
    }

    schemaText += '\n## Relationships:\n';
    for (const [name, rel] of Object.entries(this.schema.relationships)) {
        const domain = Array.isArray(rel.domain) ? rel.domain.join(' or ') : rel.domain;
        const range = Array.isArray(rel.range) ? rel.range.join(' or ') : rel.range;
        schemaText += `- A ${domain} can have a "${name}" relationship with a ${range}.`;
        if (rel.description) {
            schemaText += ` (Meaning: ${rel.description})\n`;
        } else {
            schemaText += '\n';
        }
    }

    return schemaText;
  }

  public getEnrichmentServiceName(entity: EnrichableEntity): string | undefined {
    // We assume the entity has a 'label' getter that corresponds to its type name in the ontology.
    const entityType = entity.label;
    if (!entityType) {
      return undefined;
    }

    const entityDefinition = this.schema.entities[entityType];
    return entityDefinition?.enrichment?.service;
  }

  /**
   * Loads ontologies from a list of plugins.
   * This is the new, preferred method for registering schemas.
   * @param plugins An array of OntologyPlugin instances.
   */
  public loadFromPlugins(plugins: OntologyPlugin[]): void {
    logger.debug(`Loading ontology from ${plugins.length} plugins...`);

    const allOntologies: Ontology[] = plugins.map(p => {
      return {
        name: p.name,
        entities: p.entitySchemas as Ontology['entities'],
        relationships: p.relationshipSchemas as Ontology['relationships'] || {}
      };
    });

    this.loadFromObjects(allOntologies);
    logger.info(`✅ All plugin ontologies loaded and validated.`);
  }
} 