import crmOntology from './ontology.json';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerCrm } from './register';

export const crmPlugin: OntologyPlugin = {
  name: 'crm',
  entitySchemas: crmOntology.entities,
  serviceProviders: {
    register: registerCrm,
  },
}; 