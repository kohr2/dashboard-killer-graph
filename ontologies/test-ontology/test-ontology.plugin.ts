import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

// Optional register function - only import if register.ts exists
let registerTestOntology: (() => void) | undefined;
try {
  const registerModule = require('./register');
  registerTestOntology = registerModule.registerTestOntology;
} catch (error) {
  // register.ts doesn't exist, which is fine
}

const testOntologyPlugin: OntologyPlugin = {
  name: 'test-ontology',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  entityExtraction: ontologyData.entityExtraction,
  
  // Define path aliases for this plugin
  pathAliases: {
    '@test-ontology/*': '*',                    // @test-ontology/entities -> ontologies/test-ontology/entities
    '@test-ontology/entities': 'entities',      // @test-ontology/entities -> ontologies/test-ontology/entities
    '@test-ontology/services': 'services',      // @test-ontology/services -> ontologies/test-ontology/services
    '@test-ontology/types': 'types',            // @test-ontology/types -> ontologies/test-ontology/types
  },
  
  // Optional registration hook
  onRegister: () => {
    console.log('🔧 Test-ontology plugin registered with path aliases');
  },
  
  ...(registerTestOntology && {
    serviceProviders: {
      register: registerTestOntology,
    },
  }),
};

// Export with the expected name for the plugin loader
export { testOntologyPlugin };
module.exports['test-ontologyPlugin'] = testOntologyPlugin; 