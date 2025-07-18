#!/usr/bin/env ts-node

import { QueryTranslator } from '../../src/platform/chat/application/services/query-translator.service';
import * as fs from 'fs';
import * as path from 'path';

// Load actual procurement ontology data
const procurementOntologyPath = path.join(__dirname, '../../ontologies/procurement/ontology.json');
const procurementOntologyData = JSON.parse(fs.readFileSync(procurementOntologyPath, 'utf8'));

// Extract entity types from the actual ontology
const procurementEntityTypes = procurementOntologyData.entities.map((entity: any) => entity.name);

// Create a mock ontology service that uses the actual procurement data
const mockOntologyService: any = {
  getAllEntityTypes: (): string[] => procurementEntityTypes,
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
    const allLabels = mockOntologyService.getAllAvailableLabels();
    return allLabels.includes(label);
  },
  getAlternativeLabels: (entityType: string): string[] => {
    const entity = procurementOntologyData.entities.find((e: any) => e.name === entityType);
    return entity?.properties?.alternativeLabels || [];
  },
};

async function demonstrateProcurementMappings() {
  console.log('=== Procurement Ontology Dynamic Entity Mappings Demo ===\n');

  // Create query translator with mock service
  const queryTranslator = new QueryTranslator(mockOntologyService);

  // Test queries that should work with the procurement ontology
  const testQueries = [
    'show all projects',
    'list all contracts',
    'find all buyers',
    'get all procedures',
    'show all agents',
    'list all organizations',
    'show all tenders',
    'list all lots',
    'find all contractors',
    'get all suppliers',
    'show all people',
    'list all companies',
    'find all deals'
  ];

  console.log('Testing dynamic entity mappings with procurement ontology:\n');

  for (const query of testQueries) {
    try {
      // Use the private method to test pattern matching directly
      const result = (queryTranslator as any).trySimplePatternMatching(query);
      
      if (result) {
        console.log(`✅ "${query}"`);
        console.log(`   Command: ${result.command}`);
        console.log(`   Resource Types: ${result.resourceTypes?.join(', ')}`);
        console.log('');
      } else {
        console.log(`❌ "${query}" - No pattern match found`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ "${query}" - Error: ${error}`);
      console.log('');
    }
  }

  // Show some key procurement entities
  console.log('=== Key Procurement Entity Types ===');
  console.log('Person/Agent entities:');
  const personEntities = procurementEntityTypes.filter((type: string) => 
    type.includes('Agent') || type.includes('Buyer') || type.includes('Contractor') || 
    type.includes('Tenderer') || type.includes('Candidate') || type.includes('JuryMember') ||
    type.includes('LeadBuyer') || type.includes('PaymentExecutor') || type.includes('ProcurementServiceProvider') ||
    type.includes('Reviewer') || type.includes('Mediator') || type.includes('OfferingParty') ||
    type.includes('OfferIssuer') || type.includes('ParticipationRequestProcessor') ||
    type.includes('ReliedUponEntity') || type.includes('Awarder') || type.includes('BudgetProvider') ||
    type.includes('Certifier')
  );
  console.log(personEntities.slice(0, 10).join(', ') + '...');
  console.log('');

  console.log('Work/Project entities:');
  const workEntities = procurementEntityTypes.filter((type: string) => 
    type.includes('Project') || type.includes('Procedure') || type.includes('Contract') || 
    type.includes('Lot') || type.includes('Tender') || type.includes('Offer') || 
    type.includes('Purpose') || type.includes('ProcurementObject')
  );
  console.log(workEntities.join(', '));
  console.log('');

  console.log('Organization entities:');
  const orgEntities = procurementEntityTypes.filter((type: string) => 
    type.includes('Organization') || type.includes('Business') || type.includes('Body') ||
    type.includes('Authority') || type.includes('Entity') || type.includes('Company')
  );
  console.log(orgEntities.slice(0, 10).join(', ') + '...');
  console.log('');

  console.log('=== Summary ===');
  console.log(`Total procurement entities: ${procurementEntityTypes.length}`);
  console.log(`Person/Agent entities: ${personEntities.length}`);
  console.log(`Work/Project entities: ${workEntities.length}`);
  console.log(`Organization entities: ${orgEntities.length}`);
  console.log('');
  console.log('The query translator now dynamically generates mappings based on the actual ontology entities,');
  console.log('making it ontology-agnostic and able to work with any ontology including procurement.');
}

// Run the demonstration
demonstrateProcurementMappings().catch(console.error); 