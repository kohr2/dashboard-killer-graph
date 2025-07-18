#!/usr/bin/env ts-node

import 'reflect-metadata';
import { QueryTranslator } from '../../src/platform/chat/application/services/query-translator.service';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data
const ontologies = {
  procurement: JSON.parse(fs.readFileSync(path.join(__dirname, '../../ontologies/procurement/ontology.json'), 'utf8')),
  fibo: JSON.parse(fs.readFileSync(path.join(__dirname, '../../ontologies/fibo/ontology.json'), 'utf8')),
  geonames: JSON.parse(fs.readFileSync(path.join(__dirname, '../../ontologies/geonames/ontology.json'), 'utf8')),
  isco: JSON.parse(fs.readFileSync(path.join(__dirname, '../../ontologies/isco/ontology.json'), 'utf8'))
};

// Create mock ontology service for different ontologies
function createMockOntologyService(ontologyData: any) {
  const entityTypes = ontologyData.entities.map((entity: any) => entity.name);
  
  return {
    getAllEntityTypes: (): string[] => entityTypes,
    getAllAvailableLabels: (): string[] => {
      const allLabels: string[] = [];
      ontologyData.entities.forEach((entity: any) => {
        allLabels.push(entity.name);
        if (entity.properties?.alternativeLabels) {
          allLabels.push(...entity.properties.alternativeLabels);
        }
      });
      return allLabels;
    },
    getSchemaRepresentation: (): string => {
      return ontologyData.entities
        .map((entity: any) => `${entity.name}: ${entity.description?._ || 'No description'}`)
        .join('\n');
    },
    isValidLabel: (label: string): boolean => {
      const allLabels = createMockOntologyService(ontologyData).getAllAvailableLabels();
      return allLabels.includes(label);
    },
    getAlternativeLabels: (entityType: string): string[] => {
      const entity = ontologyData.entities.find((e: any) => e.name === entityType);
      return entity?.properties?.alternativeLabels || [];
    },
  };
}

async function testQueryTranslator(query: string, ontologyName?: string) {
  console.log(`=== Testing Query Translator ===\n`);
  console.log(`Query: "${query}"`);
  if (ontologyName) {
    console.log(`Ontology: ${ontologyName}`);
  }
  console.log('');

  // Test with specific ontology or all ontologies
  const ontologiesToTest = ontologyName 
    ? { [ontologyName]: ontologies[ontologyName as keyof typeof ontologies] }
    : ontologies;

  for (const [name, ontologyData] of Object.entries(ontologiesToTest)) {
    console.log(`🔍 TESTING WITH ${name.toUpperCase()} ONTOLOGY`);
    console.log('=====================================\n');
    
    const service = createMockOntologyService(ontologyData);
    const translator = new QueryTranslator(service as any);

    try {
      const result = await translator.translate(query);
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log(`Found ${result.resourceTypes?.length || 0} entity types`);
      
      if (result.resourceTypes && result.resourceTypes.length > 0) {
        console.log('Mapped entities:');
        result.resourceTypes.forEach((entityType, index) => {
          console.log(`  ${index + 1}. ${entityType}`);
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
    
    console.log('');
  }

  console.log('=== Test Complete ===');
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx ts-node scripts/demo/test-query-translator.ts <query> [ontology]');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node scripts/demo/test-query-translator.ts "show all persons"');
    console.log('  npx ts-node scripts/demo/test-query-translator.ts "show all companies" procurement');
    console.log('  npx ts-node scripts/demo/test-query-translator.ts "find all contracts" fibo');
    console.log('');
    console.log('Available ontologies: procurement, fibo, geonames, isco');
    console.log('If no ontology is specified, all ontologies will be tested.');
    process.exit(1);
  }
  
  const query = args[0];
  const ontology = args[1];
  
  if (ontology && !ontologies[ontology as keyof typeof ontologies]) {
    console.error(`Error: Unknown ontology "${ontology}"`);
    console.log('Available ontologies:', Object.keys(ontologies).join(', '));
    process.exit(1);
  }
  
  return { query, ontology };
}

// Run the test
const { query, ontology } = parseArguments();
testQueryTranslator(query, ontology).catch(console.error); 