import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

// Optional register function - only import if register.ts exists
let registerProcurement: (() => void) | undefined;
try {
  const registerModule = require('./register');
  registerProcurement = registerModule.registerProcurement;
} catch (error) {
  // Register file doesn't exist, which is fine for ontologies without DI registration
}

export const procurementPlugin: OntologyPlugin = {
  name: 'procurement',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  entityExtraction: ontologyData.entityExtraction,
  
  // Define path aliases for this plugin
  pathAliases: {
    '@procurement/*': '*',           // @procurement/entities -> ontologies/procurement/entities
    '@procurement/entities': 'entities',  // @procurement/entities -> ontologies/procurement/entities
    '@procurement/services': 'services',  // @procurement/services -> ontologies/procurement/services
    '@procurement/types': 'types',        // @procurement/types -> ontologies/procurement/types
  },
  
  // Optional registration hook
  onRegister: () => {
    console.log('🔧 Procurement plugin registered with path aliases');
  },
  
  ...(registerProcurement && {
    serviceProviders: {
      register: registerProcurement,
    },
  }),
}; 