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

async function testPersonsQuery() {
  console.log('=== Testing "show all persons" Query ===\n');

  const mockService = createMockOntologyService();
  const queryTranslator = new QueryTranslator(mockService as any);

  const testQueries = [
    'show all persons',
    'show all people',
    'show all agents',
    'show all companies',
    'show all organizations',
    'show all contracts'
  ];

  for (const query of testQueries) {
    console.log(`Testing query: "${query}"`);
    try {
      const result = await queryTranslator.translate(query);
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log(`Found ${result.resourceTypes?.length || 0} entity types\n`);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('=== Test Complete ===');
}

// Run the test
testPersonsQuery().catch(console.error); 