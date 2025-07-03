import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerFinancial } from './register';
import financialOntology from './ontology.json';

export const financialPlugin: OntologyPlugin = {
  name: 'financial',
  entitySchemas: financialOntology.entities,
  relationshipSchemas: financialOntology.relationships,
  reasoning: financialOntology.reasoning,
  entityExtraction: financialOntology.entityExtraction,
  serviceProviders: {
    register: registerFinancial,
  },
}; 