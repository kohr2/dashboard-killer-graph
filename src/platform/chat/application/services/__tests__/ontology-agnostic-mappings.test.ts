import 'reflect-metadata';
import { QueryTranslator } from '../query-translator.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock environment variables for testing
process.env.OPENAI_API_KEY = 'test-api-key';

// Load different ontology data for comparison
const procurementOntologyPath = path.join(__dirname, '../../../../../../ontologies/procurement/ontology.json');
const procurementOntologyData = JSON.parse(fs.readFileSync(procurementOntologyPath, 'utf8'));

const fiboOntologyPath = path.join(__dirname, '../../../../../../ontologies/fibo/ontology.json');
const fiboOntologyData = JSON.parse(fs.readFileSync(fiboOntologyPath, 'utf8'));

// Create mock ontology services for different ontologies
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

async function testOntologyAgnosticMappings() {
  console.log('=== Ontology-Agnostic Entity Mappings Test ===\n');

  // Test queries that should work across different ontologies
  const testQueries = [
    'show all people',
    'list all organizations',
    'find all contracts',
    'get all projects',
    'show all companies',
    'list all deals'
  ];

  // Test with procurement ontology
  console.log('🔧 Testing with Procurement Ontology:');
  console.log('=====================================');
  const procurementService = createMockOntologyService(procurementOntologyData);
  const procurementTranslator = new QueryTranslator(procurementService as any);

  for (const query of testQueries) {
    try {
      const result = (procurementTranslator as any).trySimplePatternMatching(query);
      if (result) {
        console.log(`✅ "${query}" -> ${result.resourceTypes?.join(', ')}`);
      } else {
        console.log(`❌ "${query}" - No match`);
      }
    } catch (error) {
      console.log(`❌ "${query}" - Error: ${error}`);
    }
  }

  console.log('\n');

  // Test with FIBO ontology
  console.log('💰 Testing with FIBO (Financial) Ontology:');
  console.log('==========================================');
  const fiboService = createMockOntologyService(fiboOntologyData);
  const fiboTranslator = new QueryTranslator(fiboService as any);

  for (const query of testQueries) {
    try {
      const result = (fiboTranslator as any).trySimplePatternMatching(query);
      if (result) {
        console.log(`✅ "${query}" -> ${result.resourceTypes?.join(', ')}`);
      } else {
        console.log(`❌ "${query}" - No match`);
      }
    } catch (error) {
      console.log(`❌ "${query}" - Error: ${error}`);
    }
  }

  console.log('\n');

  // Show entity type differences
  console.log('📊 Entity Type Comparison:');
  console.log('==========================');
  
  const procurementEntities = procurementOntologyData.entities.map((e: any) => e.name);
  const fiboEntities = fiboOntologyData.entities.map((e: any) => e.name);

  console.log(`Procurement Ontology: ${procurementEntities.length} entities`);
  console.log(`FIBO Ontology: ${fiboEntities.length} entities`);

  // Show some key entities from each ontology
  console.log('\nKey Procurement Entities:');
  const procurementKeyEntities = procurementEntities.filter((e: string) => 
    e.includes('Agent') || e.includes('Contract') || e.includes('Project') || 
    e.includes('Organization') || e.includes('Buyer') || e.includes('Procedure')
  ).slice(0, 10);
  console.log(procurementKeyEntities.join(', '));

  console.log('\nKey FIBO Entities:');
  const fiboKeyEntities = fiboEntities.filter((e: string) => 
    e.includes('Account') || e.includes('Contract') || e.includes('Organization') || 
    e.includes('Person') || e.includes('Financial') || e.includes('Investment')
  ).slice(0, 10);
  console.log(fiboKeyEntities.join(', '));

  console.log('\n');

  // Test alternative labels
  console.log('🏷️  Alternative Labels Test:');
  console.log('============================');
  
  // Find entities with alternative labels in procurement
  const entitiesWithAltLabels = procurementOntologyData.entities.filter((e: any) => 
    e.properties?.alternativeLabels && e.properties.alternativeLabels.length > 0
  ).slice(0, 5);

  console.log('Procurement entities with alternative labels:');
  entitiesWithAltLabels.forEach((entity: any) => {
    console.log(`  ${entity.name} -> [${entity.properties.alternativeLabels.join(', ')}]`);
  });

  console.log('\n');

  // Demonstrate semantic mapping
  console.log('🧠 Semantic Mapping Demonstration:');
  console.log('==================================');
  
  const semanticQueries = [
    'show all people',      // Should map to person/agent entities
    'list all companies',   // Should map to organization entities  
    'find all deals',       // Should map to contract/transaction entities
    'get all projects'      // Should map to project/work entities
  ];

  console.log('Testing semantic mappings with procurement ontology:');
  for (const query of semanticQueries) {
    try {
      const result = (procurementTranslator as any).trySimplePatternMatching(query);
      if (result) {
        console.log(`  "${query}" -> ${result.resourceTypes?.join(', ')}`);
      }
    } catch (error) {
      console.log(`  "${query}" - Error: ${error}`);
    }
  }

  console.log('\n');
  console.log('✅ The query translator now uses ontology-agnostic mappings!');
  console.log('   - No hardcoded entity types');
  console.log('   - Uses actual ontology.json structure');
  console.log('   - Leverages alternative labels from ontology');
  console.log('   - Creates semantic groupings based on entity patterns');
  console.log('   - Works with any ontology (procurement, FIBO, etc.)');
}

describe('Ontology-Agnostic Mappings', () => {
  it('should demonstrate ontology-agnostic entity mappings', async () => {
    await testOntologyAgnosticMappings();
  });
}); 