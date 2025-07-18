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

async function testLLMSemanticMappings() {
  console.log('=== LLM-Powered Semantic Mappings Test ===\n');

  const mockService = createMockOntologyService();
  const queryTranslator = new QueryTranslator(mockService as any);

  // Test queries that should benefit from LLM semantic mapping
  const testQueries = [
    'show all people',
    'list all companies', 
    'find all contracts',
    'get all projects',
    'show all agents',
    'list all organizations',
    'find all deals',
    'get all buyers'
  ];

  console.log('Testing queries with LLM semantic mappings:\n');

  for (const query of testQueries) {
    try {
      // Test the pattern matching (which includes LLM semantic mappings)
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

  // Show some key procurement entities that the LLM should map
  console.log('=== Key Procurement Entities for LLM Mapping ===');
  
  const personEntities = procurementOntologyData.entities.filter((e: any) => 
    e.name.includes('Agent') || e.name.includes('Buyer') || e.name.includes('Contractor') || 
    e.name.includes('Tenderer') || e.name.includes('Candidate') || e.name.includes('JuryMember') ||
    e.name.includes('LeadBuyer') || e.name.includes('PaymentExecutor') || e.name.includes('ProcurementServiceProvider') ||
    e.name.includes('Reviewer') || e.name.includes('Mediator') || e.name.includes('OfferingParty') ||
    e.name.includes('OfferIssuer') || e.name.includes('ParticipationRequestProcessor') ||
    e.name.includes('ReliedUponEntity') || e.name.includes('Awarder') || e.name.includes('BudgetProvider') ||
    e.name.includes('Certifier')
  ).slice(0, 10);

  console.log('Person/Agent entities (should map to "people", "agents"):');
  console.log(personEntities.map((e: any) => e.name).join(', '));
  console.log('');

  const orgEntities = procurementOntologyData.entities.filter((e: any) => 
    e.name.includes('Organization') || e.name.includes('Business') || e.name.includes('Body') ||
    e.name.includes('Authority') || e.name.includes('Entity') || e.name.includes('Company')
  ).slice(0, 10);

  console.log('Organization entities (should map to "companies", "organizations"):');
  console.log(orgEntities.map((e: any) => e.name).join(', '));
  console.log('');

  const contractEntities = procurementOntologyData.entities.filter((e: any) => 
    e.name.includes('Contract') || e.name.includes('Agreement') || e.name.includes('Deal')
  ).slice(0, 10);

  console.log('Contract entities (should map to "contracts", "deals"):');
  console.log(contractEntities.map((e: any) => e.name).join(', '));
  console.log('');

  const projectEntities = procurementOntologyData.entities.filter((e: any) => 
    e.name.includes('Project') || e.name.includes('Procedure') || e.name.includes('Lot') ||
    e.name.includes('Tender') || e.name.includes('Offer') || e.name.includes('Purpose')
  ).slice(0, 10);

  console.log('Project/Work entities (should map to "projects", "procedures"):');
  console.log(projectEntities.map((e: any) => e.name).join(', '));
  console.log('');

  console.log('=== How LLM Semantic Mapping Works ===');
  console.log('1. The system analyzes the actual ontology entities');
  console.log('2. LLM identifies semantic patterns and common terms');
  console.log('3. Generates mappings like "people" → [AgentInRole, Buyer, Contractor, ...]');
  console.log('4. Users can use natural language terms in queries');
  console.log('5. No hardcoded patterns - fully ontology-agnostic');
  console.log('');
  console.log('✅ Benefits:');
  console.log('   - Works with any ontology without hardcoding');
  console.log('   - Understands semantic relationships');
  console.log('   - Supports natural language queries');
  console.log('   - Adapts to new entity types automatically');
}

// Run the test
testLLMSemanticMappings().catch(console.error); 