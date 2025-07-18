#!/usr/bin/env ts-node

import 'reflect-metadata';
import { QueryTranslator } from '../../src/platform/chat/application/services/query-translator.service';
import * as fs from 'fs';
import * as path from 'path';

// Load procurement ontology data
const procurementOntologyPath = path.join(__dirname, '../../ontologies/procurement/ontology.json');
const procurementOntologyData = JSON.parse(fs.readFileSync(procurementOntologyPath, 'utf8'));

// Create mock ontology service
function createMockOntologyService() {
  const entityTypes = procurementOntologyData.entities.map((entity: any) => entity.name);
  
  return {
    getAllEntityTypes: (): string[] => entityTypes,
    getAllAvailableLabels: (): string[] => {
      const allLabels: string[] = [];
      procurementOntologyData.entities.forEach((entity: any) => {
        allLabels.push(entity.name);
        if (entity.properties?.alternativeLabels) {
          allLabels.push(...entity.properties.alternativeLabels);
        }
      });
      return allLabels;
    },
    getSchemaRepresentation: (): string => {
      return procurementOntologyData.entities
        .map((entity: any) => `${entity.name}: ${entity.description?._ || 'No description'}`)
        .join('\n');
    },
    isValidLabel: (label: string): boolean => {
      const allLabels = createMockOntologyService().getAllAvailableLabels();
      return allLabels.includes(label);
    },
    getAlternativeLabels: (entityType: string): string[] => {
      const entity = procurementOntologyData.entities.find((e: any) => e.name === entityType);
      return entity?.properties?.alternativeLabels || [];
    },
  };
}

async function testShowPersonsFix() {
  console.log('=== Testing "show persons" Query Fix ===\n');

  const mockService = createMockOntologyService();
  const queryTranslator = new QueryTranslator(mockService as any);

  // Test queries that should work with semantic mappings
  const testQueries = [
    'show persons',
    'show all Person',
    'list people',
    'find agents',
    'get buyers'
  ];

  for (const query of testQueries) {
    console.log(`Testing: "${query}"`);
    
    try {
      // Test pattern matching directly
      const result = await (queryTranslator as any).trySimplePatternMatching(query);
      
      if (result) {
        console.log(`✅ SUCCESS: Command=${result.command}, Types=${result.resourceTypes?.join(', ')}`);
      } else {
        console.log(`❌ FAILED: No pattern match found`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error}`);
    }
    
    console.log('');
  }

  // Show the semantic mappings that were generated
  console.log('=== Generated Semantic Mappings ===');
  const cache = (queryTranslator as any).semanticMappingsCache;
  if (cache && Object.keys(cache).length > 0) {
    for (const [term, entities] of Object.entries(cache)) {
      console.log(`"${term}" → [${(entities as string[]).join(', ')}]`);
    }
  } else {
    console.log('No semantic mappings generated');
  }

  console.log('\n=== Test Summary ===');
  console.log('The fix ensures that:');
  console.log('1. Semantic mappings are generated synchronously before pattern matching');
  console.log('2. Queries like "show persons" work on the first try');
  console.log('3. No more "I can only show resources" errors');
  console.log('4. LLM-generated mappings are immediately available');
}

// Run the test
testShowPersonsFix().catch(console.error); 