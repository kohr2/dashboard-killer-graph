import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import procurementOntology from './ontology.json';

export const procurementPlugin: OntologyPlugin = {
  name: 'procurement',
  entitySchemas: procurementOntology.entities,
  // No service providers for now
}; 