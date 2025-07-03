import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file in config directory
const ontologyPath = path.join(process.cwd(), 'config/ontology/procurement.ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

export const procurementPlugin: OntologyPlugin = {
  name: 'procurement',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  // No service providers for now
}; 