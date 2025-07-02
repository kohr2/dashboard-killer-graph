import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { singleton } from 'tsyringe';
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
  vectorIndex: z.boolean().optional(),
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

const OntologyReasoningSchema = z.object({
  algorithms: z.record(z.object({
    name: z.string(),
    description: z.string(),
    entityType: z.string(),
    factors: z.array(z.string()).optional(),
    weights: z.array(z.number()).optional(),
    threshold: z.number().optional(),
    relationshipType: z.string().optional(),
    pattern: z.string().optional(),
    patternName: z.string().optional(),
  })).optional(),
});

const OntologySchemaValidator = z.object({
  name: z.string(),
  entities: z.record(OntologyEntitySchema),
  relationships: z.record(OntologyRelationshipSchema).optional(),
  reasoning: OntologyReasoningSchema.optional(),
});

// TypeScript types inferred from Zod schemas
export type Ontology = z.infer<typeof OntologySchemaValidator>;
export type EntityFactory<T> = (data: unknown) => T;

interface InternalOntologySchema {
    entities: { [key: string]: z.infer<typeof OntologyEntitySchema> };
    relationships: { [key: string]: z.infer<typeof OntologyRelationshipSchema> };
}

@singleton()
export class OntologyService {
  private ontologies: Ontology[] = [];
  private schema: InternalOntologySchema = { entities: {}, relationships: {} };

  public constructor() {
    logger.debug(`OntologyService constructor called`);
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
    this.schema = { entities: {}, relationships: {} };

    for (const ontology of ontologyObjects) {
      try {
        // Validate each object against the schema
        const validatedOntology = OntologySchemaValidator.parse(ontology);
        
        this.ontologies.push(validatedOntology);
        if (validatedOntology.entities) {
            Object.assign(this.schema.entities, validatedOntology.entities);
        }
        if (validatedOntology.relationships) {
            Object.assign(this.schema.relationships, validatedOntology.relationships);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error(`Validation failed for ontology '${ontology.name}':`, JSON.stringify(error.errors));
        } else {
          logger.error(`Error loading ontology '${ontology.name}':`, error);
        }
      }
    }
    
    logger.info(`Loaded ${Object.keys(this.schema.entities).length} entities and ${Object.keys(this.schema.relationships).length} relationships from ${ontologyObjects.length} ontology plugins`);
  }

  public loadFromPlugins(plugins: OntologyPlugin[]): void {
    logger.debug(`Loading ontology from ${plugins.length} plugins...`);
    const allOntologies: Ontology[] = plugins.map(p => {
        return {
            name: p.name,
            entities: p.entitySchemas as Ontology['entities'],
            relationships: p.relationshipSchemas as Ontology['relationships'] || {},
            reasoning: p.reasoning
        };
    });
    this.loadFromObjects(allOntologies);
    logger.info(`✅ All plugin ontologies loaded and validated.`);
  }

  public getAllEntityTypes(): string[] {
    return Object.keys(this.schema.entities);
  }

  public getPropertyEntityTypes(): string[] {
    return Object.entries(this.schema.entities)
      .filter(([, entity]) => entity.isProperty)
      .map(([name]) => name);
  }
  
  public getAllRelationshipTypes(): string[] {
    return Object.keys(this.schema.relationships);
  }

  public getIndexableEntityTypes(): string[] {
    return Object.entries(this.schema.entities)
      .filter(([, entity]) => entity.vectorIndex)
      .map(([name]) => name);
  }

  /**
   * Returns the key properties for a given entity type.
   * These are the most important properties to display when showing entity records.
   * @param entityType The entity type to get key properties for
   * @returns Array of key property names, or empty array if not found
   */
  public getKeyProperties(entityType: string): string[] {
    const entityDefinition = this.schema.entities[entityType];
    if (!entityDefinition) {
      logger.warn(`[OntologyService] Entity type not found: ${entityType}`);
      return [];
    }
    
    // Return keyProperties if defined, otherwise return empty array
    return entityDefinition.keyProperties || [];
  }

  /**
   * Generates a human-readable representation of the current graph schema.
   * The format is a simple Markdown-style list so that LLM prompts can embed
   * it directly (see QueryTranslator & MCP server).
   *
   * Example output:
   *
   * ```
   * ## Entities (2)
   * - Person: A person entity
   * - Organization: An organization entity
   *
   * ## Relationships (1)
   * - WORKS_FOR (Person → Organization): Employment relationship
   * ```
   */
  public getSchemaRepresentation(): string {
    // Build entity lines
    const entityLines = Object.entries(this.schema.entities).map(([name, def]) => {
      const desc = def.description ? `: ${def.description}` : '';
      return `- ${name}${desc}`;
    });

    // Build relationship lines
    const relationshipLines = Object.entries(this.schema.relationships).map(([name, def]) => {
      const domain = Array.isArray(def.domain) ? def.domain.join(' | ') : def.domain;
      const range = Array.isArray(def.range) ? def.range.join(' | ') : def.range;
      const arrow = ' → ';
      const desc = def.description ? `: ${def.description}` : '';
      return `- ${name} (${domain}${arrow}${range})${desc}`;
    });

    const parts: string[] = [];
    parts.push(`## Entities (${entityLines.length})`);
    if (entityLines.length) {
      parts.push(...entityLines);
    } else {
      parts.push('- _None loaded_');
    }

    parts.push('\n## Relationships (' + relationshipLines.length + ')');
    if (relationshipLines.length) {
      parts.push(...relationshipLines);
    } else {
      parts.push('- _None loaded_');
    }

    return parts.join('\n');
  }

  public getEnrichmentServiceName(entity: EnrichableEntity): string | undefined {
    const entityType = 'label' in entity ? entity.label : undefined;
    if (!entityType) return undefined;

    const entityDefinition = this.schema.entities[entityType];
    return entityDefinition?.enrichment?.service;
  }

  // NOTE: These methods are not fully implemented and are placeholders
  // to satisfy dependencies in other parts of the system.
  public getLabelsForEntityType(entityType: string): string {
    // Basic implementation: returns the type as a Neo4j label.
    // A full implementation would consider parent types from the ontology.
    logger.warn(`[OntologyService] getLabelsForEntityType is a placeholder. Returning basic label for: ${entityType}`);
    return `\`${entityType}\``;
  }

  public isValidLabel(label: string): boolean {
    // Basic implementation: checks if the label exists as an entity type.
    logger.warn(`[OntologyService] isValidLabel is a placeholder. Checking for direct existence of: ${label}`);
    return !!this.schema.entities[label];
  }

  public registerEntityType(name: string, definition: any): void {
    logger.warn(`[OntologyService] registerEntityType is a placeholder. "Registering" entity: ${name}`);
    this.schema.entities[name] = definition;
  }

  public registerRelationshipType(name: string, definition: any): void {
    logger.warn(`[OntologyService] registerRelationshipType is a placeholder. "Registering" relationship: ${name}`);
    this.schema.relationships[name] = definition;
  }

  /**
   * Returns all loaded ontologies as raw objects (for reasoning, etc.)
   */
  public getAllOntologies(): Ontology[] {
    return this.ontologies;
  }
} 