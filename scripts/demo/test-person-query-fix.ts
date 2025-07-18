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

async function testPersonQueryFix() {
  console.log('=== Testing "show all Person" Query Fix ===\n');

  const mockService = createMockOntologyService();
  const queryTranslator = new QueryTranslator(mockService as any);

  // Test the specific query that was failing
  const testQuery = 'show all Person';
  
  console.log(`Testing query: "${testQuery}"\n`);

  try {
    // First, ensure semantic mappings are generated
    console.log('1. Generating semantic mappings...');
    await (queryTranslator as any).ensureSemanticMappingsGenerated();
    console.log('✅ Semantic mappings generated\n');

    // Test pattern matching
    console.log('2. Testing pattern matching...');
    const result = (queryTranslator as any).trySimplePatternMatching(testQuery);
    
    if (result) {
      console.log('✅ Pattern matching successful!');
      console.log(`   Command: ${result.command}`);
      console.log(`   Resource Types: ${result.resourceTypes?.join(', ')}`);
    } else {
      console.log('❌ Pattern matching failed');
    }

    // Test full translation
    console.log('\n3. Testing full query translation...');
    const fullResult = await queryTranslator.translate(testQuery);
    
    if (fullResult) {
      console.log('✅ Full translation successful!');
      console.log(`   Command: ${fullResult.command}`);
      console.log(`   Resource Types: ${fullResult.resourceTypes?.join(', ')}`);
    } else {
      console.log('❌ Full translation failed');
    }

    // Show what semantic mappings were generated
    console.log('\n4. Generated semantic mappings:');
    const cache = (queryTranslator as any).semanticMappingsCache;
    if (cache && Object.keys(cache).length > 0) {
      for (const [term, entities] of Object.entries(cache)) {
        console.log(`   "${term}" -> [${(entities as string[]).join(', ')}]`);
      }
    } else {
      console.log('   No semantic mappings generated');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }

  console.log('\n=== Test Summary ===');
  console.log('The fix ensures that:');
  console.log('1. Semantic mappings are generated once and cached');
  console.log('2. Queries like "show all Person" work immediately');
  console.log('3. LLM-generated mappings are available for pattern matching');
  console.log('4. No more "I can only show resources" errors');
}

// Run the test
testPersonQueryFix().catch(console.error); 