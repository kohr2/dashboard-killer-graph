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
      const ontologyPath = path.join(__dirname, '..', '..', '..', 'config', 'ontology', 'core.ontology.json');
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
      const ontologyPath = path.join(__dirname, '..', '..', '..', 'config', 'ontology', 'core.ontology.json');
      const ontologyData = fs.readFileSync(ontologyPath, 'utf8');
      const ontology = JSON.parse(ontologyData);
      return ontology.relationships;
    } catch (error) {
      console.error('Failed to load core ontology:', error);
      return {};
    }
  })(),
}; 