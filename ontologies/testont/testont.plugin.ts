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
  ...(registerTestont && {
    serviceProviders: {
      register: registerTestont,
    },
  }),
}; 