import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

// Optional register function - only import if register.ts exists
let registerTestont: (() => void) | undefined;
try {
  const registerModule = require('./register');
  registerTestont = registerModule.registerTestont;
} catch (error) {
  // Register file doesn't exist, which is fine for ontologies without DI registration
}

export const testontPlugin: OntologyPlugin = {
  name: 'testont',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  entityExtraction: ontologyData.entityExtraction,
  
  // Define path aliases for this plugin
  pathAliases: {
    '@testont/*': '*',                    // @testont/entities -> ontologies/testont/entities
    '@testont/entities': 'entities',      // @testont/entities -> ontologies/testont/entities
    '@testont/services': 'services',      // @testont/services -> ontologies/testont/services
    '@testont/types': 'types',            // @testont/types -> ontologies/testont/types
  },
  
  // Optional registration hook
  onRegister: () => {
    console.log('🔧 Testont plugin registered with path aliases');
  },
  
  ...(registerTestont && {
    serviceProviders: {
      register: registerTestont,
    },
  }),
}; 