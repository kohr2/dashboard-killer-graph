import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

// Optional register function - only import if register.ts exists
let registerIsco: (() => void) | undefined;
try {
  const registerModule = require('./register');
  registerIsco = registerModule.registerIsco;
} catch (error) {
  // Register file doesn't exist, which is fine for ontologies without DI registration
}

export const iscoPlugin: OntologyPlugin = {
  name: 'isco',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  entityExtraction: ontologyData.entityExtraction,
  
  // Define path aliases for this plugin
  pathAliases: {
    '@isco/*': '*',                    // @isco/entities -> ontologies/isco/entities
    '@isco/entities': 'entities',      // @isco/entities -> ontologies/isco/entities
    '@isco/services': 'services',      // @isco/services -> ontologies/isco/services
    '@isco/types': 'types',            // @isco/types -> ontologies/isco/types
  },
  
  // Optional registration hook
  onRegister: () => {
    console.log('🔧 Isco plugin registered with path aliases');
  },
  
  ...(registerIsco && {
    serviceProviders: {
      register: registerIsco,
    },
  }),
}; 