import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

export interface LegacyOntologySource {
  sourcePath: string;
  ontology: Record<string, string[]>;
}

export interface StructuredOntology {
    name: string;
    entities: Record<string, { description?: string; values?: string[] }>;
    relationships?: Record<string, { domain: string; range: string | string[]; description?: string }>;
}

export interface StructuredOntologySource {
    sourcePath: string;
    ontology: StructuredOntology;
}


class OntologyService {
  private legacyOntology: Record<string, string[]> = {};
  private legacyOntologySources: LegacyOntologySource[] = [];
  private structuredOntologySources: StructuredOntologySource[] = [];

  constructor() {
    this.loadOntologies();
  }

  private loadOntologies() {
    this.legacyOntology = {};
    this.legacyOntologySources = [];
    this.structuredOntologySources = [];
    const projectRoot = process.cwd();

    // Load ontologies
    const ontologyFiles = glob.sync(path.join(projectRoot, 'src/**/ontology.json'))
        .concat(glob.sync(path.join(projectRoot, 'config/ontology/*.json')));

    ontologyFiles.forEach((filePath: string) => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const jsonContent = JSON.parse(content);
            
            // Heuristic to detect new structured format vs old legacy format
            if (jsonContent.entities && jsonContent.relationships) {
                this.structuredOntologySources.push({ sourcePath: filePath, ontology: jsonContent });
            } else {
                this.legacyOntology = { ...this.legacyOntology, ...jsonContent };
                this.legacyOntologySources.push({ sourcePath: filePath, ontology: jsonContent });
            }
        } catch (error) {
            console.error(`Failed to load ontology at ${filePath}:`, error);
        }
    });
  }

  // --- Legacy methods for backward compatibility ---
  public getOntology() {
    return this.legacyOntology;
  }

  public getOntologySources(): LegacyOntologySource[] {
    return this.legacyOntologySources;
  }
  // ------------------------------------------------

  public getStructuredOntologySources(): StructuredOntologySource[] {
    return this.structuredOntologySources;
  }
}

export const ontologyService = new OntologyService(); 