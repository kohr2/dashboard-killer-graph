import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

class OntologyService {
  private ontology: Record<string, string[]> = {};

  constructor() {
    this.loadOntologies();
  }

  private loadOntologies() {
    const projectRoot = process.cwd();

    // Load core ontology
    const coreOntologyPath = path.join(projectRoot, 'config/ontology/core.ontology.json');
    try {
      if (fs.existsSync(coreOntologyPath)) {
        const content = fs.readFileSync(coreOntologyPath, 'utf-8');
        const jsonContent = JSON.parse(content);
        this.ontology = { ...this.ontology, ...jsonContent };
      }
    } catch (error) {
      console.error('Failed to load core ontology:', error);
    }

    // Load extension ontologies
    const extensionOntologyPattern = path.join(projectRoot, 'src/extensions/*/ontology.json');
    try {
      const extensionFiles = glob.sync(extensionOntologyPattern);
      extensionFiles.forEach((filePath: string) => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const jsonContent = JSON.parse(content);
          this.ontology = { ...this.ontology, ...jsonContent };
        } catch (error) {
          console.error(`Failed to load extension ontology at ${filePath}:`, error);
        }
      });
    } catch (error) {
      console.error('Error finding extension ontologies:', error);
    }
  }

  public getTerms(ontologyName: string): string[] {
    return this.ontology[ontologyName] || [];
  }

  public getOntology() {
    return this.ontology;
  }
}

export const ontologyService = new OntologyService(); 