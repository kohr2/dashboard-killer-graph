import financialOntology from './ontology.json';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerFinancial } from './register';

export const financialPlugin: OntologyPlugin = {
  name: 'financial',
  entitySchemas: financialOntology.entities,
  serviceProviders: {
    register: registerFinancial,
  },
}; 