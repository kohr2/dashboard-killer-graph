import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { singleton } from 'tsyringe';

export interface Ontology {
  name: string;
  entities: Record<string, { description?: string; values?: string[] }>;
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

@singleton()
export class OntologyService {
  private ontologies: Ontology[] = [];
  private entityFactories = new Map<string, EntityFactory<any>>();

  public constructor() {
    this.loadOntologies();
    console.log('OntologyService initialized');
  }

  private loadOntologies() {
    this.ontologies = [];
    const projectRoot = process.cwd();
    const ontologyFiles = glob
      .sync(path.join(projectRoot, 'src/**/ontology.json'))
      .concat(glob.sync(path.join(projectRoot, 'config/ontology/*.json')));

    for (const filePath of ontologyFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ontology = JSON.parse(content) as Ontology;
        if (ontology.entities) {
          this.ontologies.push(ontology);
        } else {
            console.warn(`Skipping non-structured ontology file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to load ontology at ${filePath}:`, error);
      }
    }
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
} 