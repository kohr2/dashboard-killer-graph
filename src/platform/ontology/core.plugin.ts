import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
// Load canonical core ontology definition from JSON so that schema lives in one single source of truth
import coreOntology from '../../../config/ontology/core.ontology.json';

/**
 * Core Ontology Plugin
 * Provides fundamental entities and relationships that are domain-agnostic.
 * This includes basic concepts like Communication, Thing, etc.
 */
export const corePlugin: OntologyPlugin = {
  name: 'core',
  entitySchemas: (coreOntology as any).entities,
  relationshipSchemas: (coreOntology as any).relationships,
}; 