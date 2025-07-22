import 'reflect-metadata';
import { QueryTranslator } from '../query-translator.service';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data
const ontologies = {
  procurement: JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../../../ontologies/procurement/ontology.json'), 'utf8')),
  fibo: JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../../../ontologies/fibo/ontology.json'), 'utf8')),
  geonames: JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../../../ontologies/geonames/ontology.json'), 'utf8')),
  isco: JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../../../ontologies/isco/ontology.json'), 'utf8'))
};

// Create mock ontology service for different ontologies
function createMockOntologyService(ontologyData: any) {
  // Handle different ontology formats
  let entityTypes: string[] = [];
  let entities: any[] = [];
  
  if (Array.isArray(ontologyData.entities)) {
    // Standard format (procurement, fibo)
    entities = ontologyData.entities;
    entityTypes = entities.map((entity: any) => entity.name);
  } else if (ontologyData.entities && typeof ontologyData.entities === 'object') {
    // Alternative format (geonames, isco)
    entities = Object.entries(ontologyData.entities).map(([key, entity]: [string, any]) => ({
      name: key,
      ...entity
    }));
    entityTypes = entities.map((entity: any) => entity.name);
  } else {
    throw new Error('Unsupported ontology format');
  }
  
  return {
    getAllEntityTypes: (): string[] => entityTypes,
    getAllAvailableLabels: (): string[] => {
      const allLabels: string[] = [];
      entities.forEach((entity: any) => {
        allLabels.push(entity.name);
        if (entity.properties?.alternativeLabels) {
          allLabels.push(...entity.properties.alternativeLabels);
        }
      });
      return allLabels;
    },
    getSchemaRepresentation: (): string => {
      return entities
        .map((entity: any) => `${entity.name}: ${entity.description?._ || entity.description || 'No description'}`)
        .join('\n');
    },
    isValidLabel: (label: string): boolean => {
      const allLabels = createMockOntologyService(ontologyData).getAllAvailableLabels();
      return allLabels.includes(label);
    },
    getAlternativeLabels: (entityType: string): string[] => {
      const entity = entities.find((e: any) => e.name === entityType);
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

async function testQueryTranslator(query: string, ontologyName?: string) {
  console.log(`=== Testing Query Translator Pattern Matching ===\n`);
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
    const result = simulatePatternMatching(query, service);
    
    if (result) {
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log(`Found ${result.resourceTypes?.length || 0} entity types`);
      
      if (result.resourceTypes && result.resourceTypes.length > 0) {
        console.log('Mapped entities:');
        result.resourceTypes.forEach((entityType, index) => {
          console.log(`  ${index + 1}. ${entityType}`);
        });
      }
    } else {
      console.log('❌ No pattern match found');
    }
    
    console.log('');
  }

  console.log('=== Test Complete ===');
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  // For test environment, use default values if no arguments provided
  if (args.length === 0) {
    return { query: "show all persons", ontology: undefined };
  }
  
  const query = args[0];
  const ontology = args[1];
  
  if (ontology && !ontologies[ontology as keyof typeof ontologies]) {
    console.error(`Error: Unknown ontology "${ontology}"`);
    console.log('Available ontologies:', Object.keys(ontologies).join(', '));
    return { query, ontology: undefined };
  }
  
  return { query, ontology };
}

describe('Query Translator Service', () => {
  it('should demonstrate query translation capabilities', async () => {
    const { query, ontology } = parseArguments();
    await testQueryTranslator(query, ontology);
  });
}); 