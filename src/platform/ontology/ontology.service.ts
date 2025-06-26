import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { singleton, injectable } from 'tsyringe';

export interface Ontology {
  name: string;
  entities: Record<string, { description?: string; values?: string[], parent?: string, isProperty?: boolean }>;
  relationships?: Record<
    string,
    { domain: string; range: string | string[]; description?: string }
  >;
}

export interface OntologySource {
  sourcePath: string;
  ontology: Ontology;
}

export type EntityFactory<T> = (data: any) => T;

interface OntologyEntity {
    parent?: string;
    description?: string;
    keyProperties?: string[];
}

interface OntologyRelationship {
    domain: string | string[];
    range: string | string[];
    description?: string;
}

interface OntologySchema {
    entities: { [key: string]: OntologyEntity };
    relationships: { [key: string]: OntologyRelationship };
}

@injectable()
export class OntologyService {
  private ontologies: Ontology[] = [];
  private entityFactories = new Map<string, EntityFactory<any>>();
  private labelCache = new Map<string, string>();
  private registeredEntityTypes: Set<string> = new Set();
  private entityCreationMap: Map<string, (data: any) => any> = new Map();
  private schema: OntologySchema = { entities: {}, relationships: {} };

  public constructor() {
    // We can leave the file-based loading for the real application
    // but provide a way to load mocks for testing.
    this.loadOntologies();
    console.log('OntologyService initialized');
  }

  /**
   * Loads ontologies directly from an array of objects.
   * Useful for testing without relying on file system discovery.
   * This will clear any previously loaded ontologies.
   * @param ontologyObjects An array of ontology objects to load.
   */
  public loadFromObjects(ontologyObjects: Ontology[]) {
    this.ontologies = [];
    this.registeredEntityTypes.clear();
    this.schema = { entities: {}, relationships: {} };

    for (const ontology of ontologyObjects) {
      this.ontologies.push(ontology);
      if (ontology.entities) {
          Object.assign(this.schema.entities, ontology.entities);
          Object.keys(ontology.entities).forEach(name => this.registeredEntityTypes.add(name));
      }
      if (ontology.relationships) {
          Object.assign(this.schema.relationships, ontology.relationships);
      }
    }
  }

  private loadOntologies() {
    const workspaceRoot = path.join(__dirname, '../../..'); // Adjust based on your project structure
    const ontologyFiles = glob.sync('src/ontologies/**/ontology.json', { cwd: workspaceRoot });

    for (const file of ontologyFiles) {
        const filePath = path.join(workspaceRoot, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const ontology = JSON.parse(content);

            if (ontology.entities) {
                Object.assign(this.schema.entities, ontology.entities);
                Object.keys(ontology.entities).forEach(name => this.registeredEntityTypes.add(name));
            }
            if (ontology.relationships) {
                Object.assign(this.schema.relationships, ontology.relationships);
            }
        } catch (error) {
            console.error(`Error loading ontology file ${file}:`, error);
        }
    }
    console.log(`✅ Loaded ${ontologyFiles.length} ontology schemas.`);
  }

  public getOntologies(): Ontology[] {
    return this.ontologies;
  }

  public registerEntityType<T>(typeName: string, factory: EntityFactory<T>) {
    if (this.entityFactories.has(typeName)) {
      console.warn(
        `Entity type "${typeName}" is already registered. Overwriting.`,
      );
    }
    this.entityFactories.set(typeName, factory);
    console.log(`Entity type "${typeName}" registered.`);
  }

  public createEntity<T>(typeName: string, data: any): T {
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
    let schemaText = 'The graph schema is as follows:\n\n';

    schemaText += '## Entities:\n';
    for (const [name, entity] of Object.entries(this.schema.entities)) {
        schemaText += `- ${name}`;
        if (entity.parent) {
            schemaText += ` (is a type of ${entity.parent})`;
        }
        if(entity.description) {
            schemaText += `: ${entity.description}\n`;
        } else {
            schemaText += '\n';
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
} 