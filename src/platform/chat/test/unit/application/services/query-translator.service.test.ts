import 'reflect-metadata';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Mock the dependencies using a factory function
const mockOpenAICreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

// Load actual procurement ontology data
const procurementOntologyPath = path.join(__dirname, '../../../../../../../ontologies/procurement/ontology.json');
const procurementOntologyData = JSON.parse(fs.readFileSync(procurementOntologyPath, 'utf8'));

// Extract entity types from the actual ontology
const procurementEntityTypes = procurementOntologyData.entities.map((entity: any) => entity.name);

// Create a mock ontology service that uses the actual procurement data
const mockOntologyService: any = {
  getAllEntityTypes: jest.fn((): string[] => procurementEntityTypes),
  getAllAvailableLabels: jest.fn((): string[] => {
    const allLabels: string[] = [];
    procurementOntologyData.entities.forEach((entity: any) => {
      allLabels.push(entity.name);
      if (entity.properties?.alternativeLabels) {
        allLabels.push(...entity.properties.alternativeLabels);
      }
    });
    return allLabels;
  }),
  getSchemaRepresentation: jest.fn((): string => {
    return procurementOntologyData.entities
      .map((entity: any) => `${entity.name}: ${entity.description?._ || 'No description'}`)
      .join('\n');
  }),
  isValidLabel: jest.fn((label: string): boolean => {
    const allLabels = mockOntologyService.getAllAvailableLabels();
    return allLabels.includes(label);
  }),
  getAlternativeLabels: jest.fn((entityType: string): string[] => {
    const entity = procurementOntologyData.entities.find((e: any) => e.name === entityType);
    return entity?.properties?.alternativeLabels || [];
  }),
};

jest.mock('@platform/ontology/ontology.service', () => ({
  __esModule: true,
  OntologyService: jest.fn().mockImplementation(() => mockOntologyService),
}));

describe('QueryTranslator with Procurement Ontology', () => {
  let queryTranslator: QueryTranslator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a mocked OpenAI instance to pass to QueryTranslator
    const mockOpenAI = new OpenAI() as any;
    queryTranslator = new QueryTranslator(mockOntologyService as any, mockOpenAI);
  });

  describe('Christopher Garcia working on query', () => {
    it('should generate appropriate query for "what is Christopher Garcia working on"', async () => {
      // Mock OpenAI response for the specific query
      const mockOpenAIResponse = {
        command: 'show_related',
        resourceTypes: ['Project', 'Procedure', 'Contract', 'Lot'],
        relatedTo: ['AgentInRole', 'Contractor', 'Buyer', 'Tenderer'],
        filters: { name: 'Christopher Garcia' },
        relationshipType: 'WORKS_ON'
      };

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockOpenAIResponse)
          }
        }]
      });

      const query = 'what is Christopher Garcia working on';
      const result = await queryTranslator.translate(query);

      // Verify the result structure
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('resourceTypes');
      expect(result).toHaveProperty('relatedTo');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('relationshipType');

      // Verify the command is appropriate for a relational query
      expect(result.command).toBe('show_related');

      // Verify resource types are valid procurement entities
      expect(result.resourceTypes).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^(Project|Procedure|Contract|Lot|Tender|Offer|Purpose|ProcurementObject)$/)
        ])
      );

      // Verify relatedTo contains person/agent entities
      expect(result.relatedTo).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^(AgentInRole|Contractor|Buyer|Tenderer|Candidate|JuryMember|LeadBuyer|PaymentExecutor|ProcurementServiceProvider|Reviewer|Mediator|OfferingParty|OfferIssuer|ParticipationRequestProcessor|ReliedUponEntity|Awarder|BudgetProvider|Certifier)$/)
        ])
      );

      // Verify filters contain the person's name
      expect(result.filters).toEqual(
        expect.objectContaining({
          name: 'Christopher Garcia'
        })
      );

      // Log the actual result for inspection
      console.log('Generated query for "what is Christopher Garcia working on":');
      console.log(JSON.stringify(result, null, 2));
      console.log('\nAvailable procurement entity types:');
      console.log(procurementEntityTypes.slice(0, 20).join(', ') + '...');
    });

    it('should handle the query with simple pattern matching fallback', async () => {
      // Mock OpenAI to fail
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'));

      const query = 'what is Christopher Garcia working on';
      const result = await queryTranslator.translate(query);

      // Should fall back to simple pattern matching or unknown
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('resourceTypes');

      console.log('Fallback result for "what is Christopher Garcia working on":');
      console.log(JSON.stringify(result, null, 2));
    });
  });

  describe('Procurement ontology entity types', () => {
    it('should have relevant person/agent entities for Christopher Garcia', () => {
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

      console.log('Person/Agent entities in procurement ontology:');
      console.log(personEntities);
      expect(personEntities.length).toBeGreaterThan(0);
    });

    it('should have relevant work/project entities', () => {
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

      console.log('Work/Project entities in procurement ontology:');
      console.log(workEntities);
      expect(workEntities.length).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Entity Mappings', () => {
    it('should generate appropriate mappings for procurement ontology', async () => {
      // Test that the dynamic mappings work with procurement entities
      const mockOpenAI = new OpenAI() as any;
      const queryTranslator = new QueryTranslator(mockOntologyService as any, mockOpenAI);
      
      // Test simple pattern matching with procurement entities
      const testQueries = [
        'show all projects',
        'list all contracts', 
        'find all buyers',
        'get all procedures',
        'show all agents',
        'list all organizations'
      ];

      for (const query of testQueries) {
        const result = await queryTranslator['trySimplePatternMatching'](query);
        if (result) {
          console.log(`Query: "${query}" -> Result:`, JSON.stringify(result, null, 2));
          
          // Verify the result has valid procurement entity types
          expect(result.command).toBe('show');
          expect(result.resourceTypes).toBeDefined();
          expect(result.resourceTypes!.length).toBeGreaterThan(0);
          
          // Verify all resource types are valid procurement entities
          result.resourceTypes!.forEach((resourceType: string) => {
            expect(procurementEntityTypes).toContain(resourceType);
          });
        }
      }
    });

    it('should handle procurement-specific entity types', async () => {
      const mockOpenAI = new OpenAI() as any;
      const queryTranslator = new QueryTranslator(mockOntologyService as any, mockOpenAI);
      
      // Test with procurement-specific terms
      const procurementQueries = [
        'show all tenders',
        'list all lots',
        'find all contractors',
        'get all procedures',
        'show all buyers',
        'list all suppliers'
      ];

      for (const query of procurementQueries) {
        const result = await queryTranslator['trySimplePatternMatching'](query);
        if (result) {
          console.log(`Procurement Query: "${query}" -> Result:`, JSON.stringify(result, null, 2));
          
          // Verify the result uses procurement entity types
          expect(result.command).toBe('show');
          expect(result.resourceTypes).toBeDefined();
          
          // Check that it maps to actual procurement entities
          const hasProcurementEntity = result.resourceTypes!.some((type: string) => 
            procurementEntityTypes.includes(type)
          );
          expect(hasProcurementEntity).toBe(true);
        }
      }
    });

    it('should handle common language variations', async () => {
      const mockOpenAI = new OpenAI() as any;
      const queryTranslator = new QueryTranslator(mockOntologyService as any, mockOpenAI);
      
      // Test common language variations that should map to procurement entities
      const commonVariations = [
        'show all people', // should map to person/agent entities
        'list all companies', // should map to organization entities
        'find all deals', // should map to contract entities
        'get all projects' // should map to project/work entities
      ];

      for (const query of commonVariations) {
        const result = await queryTranslator['trySimplePatternMatching'](query);
        if (result) {
          console.log(`Common Variation: "${query}" -> Result:`, JSON.stringify(result, null, 2));
          
          expect(result.command).toBe('show');
          expect(result.resourceTypes).toBeDefined();
          expect(result.resourceTypes!.length).toBeGreaterThan(0);
        }
      }
    });
  });
}); 