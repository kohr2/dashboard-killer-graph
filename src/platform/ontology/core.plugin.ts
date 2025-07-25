import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Core Ontology Plugin
 * Provides fundamental entities and relationships that are domain-agnostic.
 * This includes basic concepts like Communication, Thing, etc.
 */
export const corePlugin: OntologyPlugin = {
  name: 'core',
  entitySchemas: (() => {
    try {
      // Try multiple possible paths for the core ontology file
      const possiblePaths = [
        path.join(process.cwd(), 'config', 'ontology', 'core.ontology.json'),
        path.join(__dirname, '..', '..', '..', 'config', 'ontology', 'core.ontology.json'),
        path.join(__dirname, '..', '..', '..', '..', 'config', 'ontology', 'core.ontology.json')
      ];
      
      let ontologyPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          ontologyPath = testPath;
          break;
        }
      }
      
      if (!ontologyPath) {
        console.error('Core ontology file not found in any of the expected locations:', possiblePaths);
        return {};
      }
      
      const ontologyData = fs.readFileSync(ontologyPath, 'utf8');
      const ontology = JSON.parse(ontologyData);
      return ontology.entities;
    } catch (error) {
      console.error('Failed to load core ontology:', error);
      return {};
    }
  })(),
  relationshipSchemas: (() => {
    try {
      // Try multiple possible paths for the core ontology file
      const possiblePaths = [
        path.join(process.cwd(), 'config', 'ontology', 'core.ontology.json'),
        path.join(__dirname, '..', '..', '..', 'config', 'ontology', 'core.ontology.json'),
        path.join(__dirname, '..', '..', '..', '..', 'config', 'ontology', 'core.ontology.json')
      ];
      
      let ontologyPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          ontologyPath = testPath;
          break;
        }
      }
      
      if (!ontologyPath) {
        console.error('Core ontology file not found in any of the expected locations:', possiblePaths);
        return {};
      }
      
      const ontologyData = fs.readFileSync(ontologyPath, 'utf8');
      const ontology = JSON.parse(ontologyData);
      return ontology.relationships;
    } catch (error) {
      console.error('Failed to load core ontology:', error);
      return {};
    }
  })(),
}; 