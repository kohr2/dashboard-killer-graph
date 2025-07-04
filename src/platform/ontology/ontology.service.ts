import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { singleton } from 'tsyringe';
import { z } from 'zod';
import { logger } from '@common/utils/logger';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';

// Local interface for testing - matches the generated DTO structure
interface OrganizationDTO {
  id: string;
  type: string;
  label?: string | null;
  name?: string;
  [key: string]: any;
}

// Zod Schemas for validation
const OntologyPropertySchema = z.object({
  type: z.string(),
  description: z.string(),
});

const OntologyEntitySchema = z.object({
  description: z.union([
    z.string(),
    z.object({
      _: z.string(),
      $: z.record(z.any()).optional()
    })
  ]).optional(),
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

// Updated to handle both formats: domain/range and source/target
const OntologyRelationshipSchema = z.object({
  // Expected format (domain/range)
  domain: z.union([z.string(), z.array(z.string())]).optional(),
  range: z.union([z.string(), z.array(z.string())]).optional(),
  // Actual format used in ontology files (source/target)
  source: z.union([z.string(), z.array(z.string())]).optional(),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  // Handle both string and object descriptions
  description: z.union([
    z.string(),
    z.object({
      _: z.string(),
      $: z.record(z.any()).optional()
    })
  ]).optional(),
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
  entities: z.union([
    z.record(OntologyEntitySchema),
    z.array(z.object({
      name: z.string(),
      description: z.union([z.string(), z.object({ _: z.string(), $: z.record(z.any()).optional() })]).optional(),
      properties: z.record(z.any()).optional(),
      keyProperties: z.array(z.string()).optional(),
      vectorIndex: z.boolean().optional(),
      documentation: z.string().optional(),
    }))
  ]),
  relationships: z.union([
    z.record(OntologyRelationshipSchema),
    z.array(z.object({
      name: z.string(),
      description: z.union([
        z.string(),
        z.object({
          _: z.string(),
          $: z.record(z.any()).optional()
        })
      ]).optional(),
      source: z.union([z.string(), z.array(z.string())]).optional(),
      target: z.union([z.string(), z.array(z.string())]).optional(),
      domain: z.union([z.string(), z.array(z.string())]).optional(),
      range: z.union([z.string(), z.array(z.string())]).optional(),
      documentation: z.string().optional(),
    }))
  ]).optional(),
  reasoning: OntologyReasoningSchema.optional(),
});

// TypeScript types inferred from Zod schemas
export type Ontology = z.infer<typeof OntologySchemaValidator>;
export type EntityFactory<T> = (data: unknown) => T;

interface InternalOntologySchema {
    entities: { [key: string]: z.infer<typeof OntologyEntitySchema> };
    relationships: { [key: string]: z.infer<typeof OntologyRelationshipSchema> };
}

// Add a type guard for object descriptions
function hasUnderscoreProp(obj: unknown): obj is { _: string } {
  return typeof obj === 'object' && obj !== null && '_' in obj && typeof (obj as any)._ === 'string';
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
        
        // Normalize entities from array to object format
        const normalizedEntities = Array.isArray(validatedOntology.entities) ?
          Object.fromEntries(
            (validatedOntology.entities as any[]).map((entity: any) => [
              entity.name,
              {
                ...entity,
                description: typeof entity.description === 'string'
                  ? entity.description
                  : (hasUnderscoreProp(entity.description)
                      ? entity.description._
                      : ''),
              }
            ])
          ) :
          Object.fromEntries(
            Object.entries(validatedOntology.entities as Record<string, any>).map(([name, entity]: [string, any]) => [
              name,
              {
                ...entity,
                description: typeof entity.description === 'string'
                  ? entity.description
                  : (hasUnderscoreProp(entity.description)
                      ? entity.description._
                      : ''),
              }
            ])
          );
        
        // Normalize relationships from array to object format and from source/target to domain/range
        const normalizedRelationships = validatedOntology.relationships ? 
          (Array.isArray(validatedOntology.relationships) ?
            Object.fromEntries(
              (validatedOntology.relationships as any[]).map((rel: any) => [
                rel.name,
                {
                  ...rel,
                  domain: rel.domain || rel.source,
                  range: rel.range || rel.target,
                  description: typeof rel.description === 'string'
                    ? rel.description
                    : (hasUnderscoreProp(rel.description)
                        ? rel.description._
                        : ''),
                }
              ])
            ) :
            Object.fromEntries(
              Object.entries(validatedOntology.relationships as Record<string, any>).map(([name, rel]: [string, any]) => [
                name,
                {
                  ...rel,
                  domain: rel.domain || rel.source,
                  range: rel.range || rel.target,
                  description: typeof rel.description === 'string'
                    ? rel.description
                    : (hasUnderscoreProp(rel.description)
                        ? rel.description._
                        : ''),
                }
              ])
            )
          ) : {};
        
        const normalizedOntology = {
          ...validatedOntology,
          entities: normalizedEntities,
          relationships: normalizedRelationships
        };
        
        this.ontologies.push(normalizedOntology);
        if (normalizedOntology.entities) {
            Object.assign(this.schema.entities, normalizedOntology.entities);
        }
        if (normalizedOntology.relationships) {
            Object.assign(this.schema.relationships, normalizedOntology.relationships);
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

  /**
   * Returns the enrichment service name for a given entity.
   * This method extracts the entity type from the entity's label property
   * and looks up the enrichment service configuration in the ontology.
   * 
   * @param entity The entity to get enrichment service for
   * @returns The enrichment service name if configured, undefined otherwise
   */
  public getEnrichmentServiceName(entity: OrganizationDTO): string | undefined {
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

  // ------------------------------------------------------------------
  // ⚠️  Legacy API for tests that expect OntologyService.getInstance().
  // Keeps backward-compat during the ongoing DI cleanup.
  // ------------------------------------------------------------------
  private static instance: OntologyService;

  public static getInstance(): OntologyService {
    if (!this.instance) {
      try {
        // Try to reuse any container‐managed singleton first
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { container } = require('tsyringe');
        this.instance = container.resolve(OntologyService);
      } catch {
        // Fallback: create a standalone instance (sufficient for unit tests)
        this.instance = new OntologyService();
      }
    }
    return this.instance;
  }
} 