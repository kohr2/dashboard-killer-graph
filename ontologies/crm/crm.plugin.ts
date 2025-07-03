import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerCrm } from './register';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

export const crmPlugin: OntologyPlugin = {
  name: 'crm',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  serviceProviders: {
    register: registerCrm,
  },
}; 