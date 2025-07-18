#!/usr/bin/env ts-node

import { QueryTranslator } from '../../src/platform/chat/application/services/query-translator.service';
import { OntologyService } from '../../src/platform/ontology/ontology.service';
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

async function testProcurementQuery() {
  console.log('=== Procurement Ontology Query Translation Test ===\n');

  // Create query translator with mock service
  const queryTranslator = new QueryTranslator(mockOntologyService);

  // Test query
  const query = 'what is Christopher Garcia working on';
  console.log(`Query: "${query}"\n`);

  try {
    const result = await queryTranslator.translate(query);
    
    console.log('Generated Structured Query:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    // Analyze the result
    console.log('Analysis:');
    console.log(`- Command: ${result.command}`);
    console.log(`- Resource Types: ${result.resourceTypes?.join(', ') || 'None'}`);
    console.log(`- Related To: ${result.relatedTo?.join(', ') || 'None'}`);
    console.log(`- Filters: ${JSON.stringify(result.filters) || 'None'}`);
    console.log(`- Relationship Type: ${result.relationshipType || 'None'}`);
    console.log(`- Source Entity Name: ${result.sourceEntityName || 'None'}`);

    // Show relevant procurement entities
    console.log('\n=== Relevant Procurement Entities ===');
    
    const personEntities = procurementEntityTypes.filter((type: string) => 
      type.includes('Agent') || 
      type.includes('Person') || 
      type.includes('Buyer') || 
      type.includes('Contractor') || 
      type.includes('Tenderer') ||
      type.includes('Candidate') ||
      type.includes('JuryMember') ||
      type.includes('LeadBuyer') ||
      type.includes('PaymentExecutor') ||
      type.includes('ProcurementServiceProvider') ||
      type.includes('Reviewer') ||
      type.includes('Mediator') ||
      type.includes('OfferingParty') ||
      type.includes('OfferIssuer') ||
      type.includes('ParticipationRequestProcessor') ||
      type.includes('ReliedUponEntity') ||
      type.includes('Awarder') ||
      type.includes('BudgetProvider') ||
      type.includes('Certifier')
    );

    console.log('Person/Agent entities:');
    console.log(personEntities.join(', '));
    console.log('\n');

    const workEntities = procurementEntityTypes.filter((type: string) => 
      type.includes('Project') || 
      type.includes('Procedure') || 
      type.includes('Contract') || 
      type.includes('Lot') || 
      type.includes('Tender') || 
      type.includes('Offer') || 
      type.includes('Purpose') || 
      type.includes('ProcurementObject')
    );

    console.log('Work/Project entities:');
    console.log(workEntities.join(', '));
    console.log('\n');

    console.log('=== Expected Query Behavior ===');
    console.log('For "what is Christopher Garcia working on", the query translator should:');
    console.log('1. Recognize this as a relational query (show_related command)');
    console.log('2. Identify Christopher Garcia as a person/agent entity');
    console.log('3. Look for work-related entities (Project, Procedure, Contract, etc.)');
    console.log('4. Set up filters to find the specific person');
    console.log('5. Potentially specify a relationship type like "WORKS_ON"');

  } catch (error) {
    console.error('Error translating query:', error);
  }
}

// Run the test
testProcurementQuery().catch(console.error); 