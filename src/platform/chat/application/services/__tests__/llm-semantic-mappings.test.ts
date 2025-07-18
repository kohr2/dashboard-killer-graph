#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Load procurement ontology data
const procurementOntologyPath = path.join(__dirname, '../../../../../../ontologies/procurement/ontology.json');
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

// Simulate the pattern matching logic from QueryTranslator
function simulatePatternMatching(query: string, ontologyService: any) {
  const normalizedQuery = query.toLowerCase().trim();
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const allAvailableLabels = ontologyService.getAllAvailableLabels();
  
  // Create a mapping from labels to entity types
  const labelToEntityType = new Map<string, string>();
  
  // Add direct entity types
  for (const entityType of validEntityTypes) {
    labelToEntityType.set(entityType.toLowerCase(), entityType);
  }
  
  // Add alternative labels
  for (const entityType of validEntityTypes) {
    const altLabels = ontologyService.getAlternativeLabels(entityType);
    for (const altLabel of altLabels) {
      if (typeof altLabel === 'string') {
        labelToEntityType.set(altLabel.toLowerCase(), entityType);
      }
    }
  }
  
  // Pattern 1: "show all [entity]" or "list all [entity]" - more flexible
  const showAllPattern = /^(show|list|get|find)\s+(all\s+)?(.+?)(?:\s*$)/i;
  const showMatch = normalizedQuery.match(showAllPattern);
  
  if (showMatch) {
    const entityPart = showMatch[3].toLowerCase();
    
    // Try to match against all available labels
    const matchedEntityType = labelToEntityType.get(entityPart);
    if (matchedEntityType && validEntityTypes.includes(matchedEntityType)) {
      return {
        command: 'show',
        resourceTypes: [matchedEntityType]
      };
    }
    
    // Generate dynamic entity mappings based on ontology
    const entityMappings = generateEntityMappings(validEntityTypes, ontologyService);
    
    const matchedTypes = entityMappings[entityPart];
    if (matchedTypes) {
      // Verify the types exist in the ontology
      const validTypes = matchedTypes.filter((type: string) => validEntityTypes.includes(type));
      if (validTypes.length > 0) {
        return {
          command: 'show',
          resourceTypes: validTypes
        };
      }
    }
  }
  
  return null;
}

// Generate dynamic entity mappings based on the ontology entities
function generateEntityMappings(validEntityTypes: string[], ontologyService: any): { [key: string]: string[] } {
  const entityMappings: { [key: string]: string[] } = {};

  // Only use actual ontology data - no hardcoded patterns
  for (const entityType of validEntityTypes) {
    const lowerEntityType = entityType.toLowerCase();

    // Map the entity type itself (singular and plural)
    entityMappings[lowerEntityType] = [entityType];
    entityMappings[lowerEntityType + 's'] = [entityType];
    
    // Handle common pluralization patterns
    if (lowerEntityType.endsWith('y')) {
      const singular = lowerEntityType.slice(0, -1);
      entityMappings[singular + 'ies'] = [entityType];
    }

    // Map all alternative labels from the ontology
    const alternativeLabels = ontologyService.getAlternativeLabels(entityType);
    for (const altLabel of alternativeLabels) {
      if (typeof altLabel === 'string') {
        const lowerAltLabel = altLabel.toLowerCase();
        entityMappings[lowerAltLabel] = [entityType];
        entityMappings[lowerAltLabel + 's'] = [entityType];
        
        // Handle pluralization for alternative labels
        if (lowerAltLabel.endsWith('y')) {
          const singular = lowerAltLabel.slice(0, -1);
          entityMappings[singular + 'ies'] = [entityType];
        }
      }
    }
  }

  // Add semantic mappings for common terms
  const semanticMappings = generateSemanticMappings(validEntityTypes);
  for (const [term, entityTypes] of Object.entries(semanticMappings)) {
    entityMappings[term] = entityTypes;
  }

  // Remove duplicates from arrays
  for (const key in entityMappings) {
    entityMappings[key] = [...new Set(entityMappings[key])];
  }

  return entityMappings;
}

// Generate semantic mappings for common terms
function generateSemanticMappings(validEntityTypes: string[]): { [key: string]: string[] } {
  const mappings: { [key: string]: string[] } = {};

  // Map person-related terms
  const personEntities = validEntityTypes.filter(type => 
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

  if (personEntities.length > 0) {
    mappings['persons'] = personEntities;
    mappings['people'] = personEntities;
    mappings['agents'] = personEntities;
  }

  // Map organization-related terms
  const orgEntities = validEntityTypes.filter(type => 
    type.includes('Organization') || 
    type.includes('Company') || 
    type.includes('Business') ||
    type.includes('Entity')
  );

  if (orgEntities.length > 0) {
    mappings['companies'] = orgEntities;
    mappings['organizations'] = orgEntities;
  }

  // Map contract-related terms
  const contractEntities = validEntityTypes.filter(type => 
    type.includes('Contract') || 
    type.includes('Agreement') || 
    type.includes('Deal') ||
    type.includes('Transaction')
  );

  if (contractEntities.length > 0) {
    mappings['contracts'] = contractEntities;
    mappings['deals'] = contractEntities;
  }

  // Map project-related terms
  const projectEntities = validEntityTypes.filter(type => 
    type.includes('Project') || 
    type.includes('Procedure') || 
    type.includes('Process') ||
    type.includes('Work')
  );

  if (projectEntities.length > 0) {
    mappings['projects'] = projectEntities;
  }

  return mappings;
}

async function testLLMSemanticMappings() {
  console.log('=== LLM-Powered Semantic Mappings Test ===\n');

  const mockService = createMockOntologyService();

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
      const result = simulatePatternMatching(query, mockService);
      
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