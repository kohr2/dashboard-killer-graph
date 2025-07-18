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

async function debugSemanticMappings() {
  console.log('=== Debugging Semantic Mappings ===\n');

  const mockService = createMockOntologyService();
  const queryTranslator = new QueryTranslator(mockService as any);

  console.log('1. Testing "show all persons" query...\n');
  
  try {
    const result = await queryTranslator.translate('show all persons');
    console.log('Translation result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Translation error:', error);
  }

  console.log('\n2. Checking semantic mappings cache...');
  const cache = (queryTranslator as any).semanticMappingsCache;
  console.log('Cache generated:', (queryTranslator as any).semanticMappingsGenerated);
  console.log('Cache keys:', Object.keys(cache));
  
  if (Object.keys(cache).length > 0) {
    console.log('Cache contents:');
    for (const [term, entities] of Object.entries(cache)) {
      console.log(`  "${term}" -> [${(entities as string[]).join(', ')}]`);
    }
  } else {
    console.log('Cache is empty');
  }

  console.log('\n3. Testing pattern matching directly...');
  try {
    const patternResult = await (queryTranslator as any).trySimplePatternMatching('show all persons');
    console.log('Pattern matching result:', JSON.stringify(patternResult, null, 2));
  } catch (error) {
    console.error('Pattern matching error:', error);
  }

  console.log('\n4. Checking available labels...');
  const allLabels = mockService.getAllAvailableLabels();
  console.log('Total labels:', allLabels.length);
  console.log('Labels containing "person":', allLabels.filter(l => l.toLowerCase().includes('person')));
  console.log('Labels containing "agent":', allLabels.filter(l => l.toLowerCase().includes('agent')));
  console.log('Labels containing "buyer":', allLabels.filter(l => l.toLowerCase().includes('buyer')));

  console.log('\n5. Checking entity types...');
  const entityTypes = mockService.getAllEntityTypes();
  console.log('Total entity types:', entityTypes.length);
  console.log('Person/Agent entity types:', entityTypes.filter(e => 
    e.includes('Agent') || e.includes('Buyer') || e.includes('Contractor') || 
    e.includes('Tenderer') || e.includes('Candidate') || e.includes('JuryMember') ||
    e.includes('LeadBuyer') || e.includes('PaymentExecutor') || e.includes('ProcurementServiceProvider') ||
    e.includes('Reviewer') || e.includes('Mediator') || e.includes('OfferingParty') ||
    e.includes('OfferIssuer') || e.includes('ParticipationRequestProcessor') ||
    e.includes('ReliedUponEntity') || e.includes('Awarder') || e.includes('BudgetProvider') ||
    e.includes('Certifier')
  ));
}

// Run the debug
debugSemanticMappings().catch(console.error); 