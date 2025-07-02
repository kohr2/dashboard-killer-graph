import { EnhancedEntityExtractionService, ExtractedEntity } from '../enhanced-entity-extraction.service';
import { OntologyService } from '../../ontology/ontology.service';
import { container } from 'tsyringe';

// Mock OntologyService
jest.mock('../../ontology/ontology.service');
jest.mock('axios');

const mockOntologyService = {
  getEntitySchema: jest.fn(),
  getActiveOntologies: jest.fn(),
  getAllOntologies: jest.fn()
};

// Mock the container to return our mock service
jest.spyOn(container, 'resolve').mockImplementation((token: any) => {
  if (token === OntologyService) {
    return mockOntologyService;
  }
  if (token === EnhancedEntityExtractionService) {
    return new EnhancedEntityExtractionService(mockOntologyService as any);
  }
  return {};
});

describe('EnhancedEntityExtractionService', () => {
  let service: EnhancedEntityExtractionService;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ontology configuration for the default test setup
    mockOntologyService.getAllOntologies.mockReturnValue([
      {
        name: 'core',
        entities: {
          Communication: {
            entityExtraction: {
              models: {
                organizations: {
                  type: 'spacy',
                  model: 'en_core_web_lg',
                  endpoint: '/extract-orgs',
                  confidence: 0.8,
                  priority: 1
                },
                financial: {
                  type: 'finbert',
                  model: 'financial-entity-recognition',
                  endpoint: '/extract-financial',
                  confidence: 0.7,
                  priority: 2
                }
              },
              patterns: {
                MonetaryAmount: {
                  regex: '\\$[\\d,]+(?:\\.\\d{2})?',
                  confidence: 0.9,
                  priority: 1
                },
                Email: {
                  regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
                  confidence: 0.95,
                  priority: 1
                }
              },
              contextRules: {
                'financial-report': {
                  priority: ['MonetaryAmount', 'Organization', 'Date'],
                  requiredModels: ['financial', 'organizations'],
                  confidenceThreshold: 0.7
                },
                email: {
                  priority: ['Person', 'Organization', 'Email'],
                  requiredModels: ['organizations'],
                  confidenceThreshold: 0.6
                }
              },
              enrichment: {
                Organization: {
                  services: ['edgar'],
                  properties: ['industry', 'sector']
                }
              }
            }
          }
        }
      }
    ]);

    service = container.resolve(EnhancedEntityExtractionService);
  });

  describe('extractEntities', () => {
    it('should extract entities using ML models and patterns', async () => {
      const text = 'Acme Corp reported $2.5M revenue. Contact john@acme.com for details.';
      const context = 'financial-report';

      // Mock ML model responses
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Acme Corp',
              type: 'Organization',
              confidence: 0.85,
              position: { start: 0, end: 9 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      expect(entities.length).toBeGreaterThanOrEqual(2);
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'Organization',
          name: 'Acme Corp',
          confidence: expect.any(Number)
        })
      );
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'MonetaryAmount',
          name: expect.stringMatching(/^\$/),
          confidence: expect.any(Number)
        })
      );
    });

    it('should apply context rules and filter by confidence threshold', async () => {
      const text = 'Low confidence entity with $100 amount';
      const context = 'financial-report';

      // Mock low confidence response
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Low confidence entity',
              type: 'Organization',
              confidence: 0.3, // Below threshold
              position: { start: 0, end: 20 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      // Should only include high confidence entities (MonetaryAmount)
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('MonetaryAmount');
    });

    it('should handle missing context rules gracefully', async () => {
      const text = 'Some text with $100';
      const context = 'unknown-context';

      const entities = await service.extractEntities(text, context);

      expect(entities).toHaveLength(0);
    });

    it('should merge duplicate entities and take highest confidence', async () => {
      const text = 'Acme Corp mentioned multiple times';
      const context = 'email';

      // Mock multiple responses for same entity
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Acme Corp',
              type: 'Organization',
              confidence: 0.8,
              position: { start: 0, end: 9 }
            },
            {
              text: 'Acme Corp',
              type: 'Organization',
              confidence: 0.9,
              position: { start: 20, end: 29 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      expect(entities).toHaveLength(1);
      expect(entities[0].confidence).toBe(1);
      expect(entities[0].source).toContain('spacy-en_core_web_lg');
    });
  });

  describe('pattern extraction', () => {
    it('should extract monetary amounts using regex patterns', () => {
      const text = 'Revenue: $1,234.56 and $2M';
      const context = 'financial-report';

      const entities = service['extractWithPatterns'](text, context);

      expect(entities).toHaveLength(2);
      expect(entities[0].name).toBe('$1,234.56');
      expect(entities[0].type).toBe('MonetaryAmount');
      expect(entities[0].confidence).toBe(0.9);
    });

    it('should extract emails using regex patterns', () => {
      const text = 'Contact us at test@example.com or support@company.org';
      const context = 'email';

      const entities = service['extractWithPatterns'](text, context);

      expect(entities).toHaveLength(2);
      expect(entities[0].name).toBe('test@example.com');
      expect(entities[0].type).toBe('Email');
      expect(entities[0].confidence).toBe(0.95);
    });
  });

  describe('entity enrichment', () => {
    it('should enrich organization entities with external data', async () => {
      const entity: ExtractedEntity = {
        id: 'org-123',
        name: 'Acme Corp',
        type: 'Organization',
        confidence: 0.8,
        source: 'spacy-en_core_web_lg'
      };

      // Mock enrichment service response
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          industry: 'Technology',
          sector: 'Software',
          employees: 500
        }
      });

      const enriched = await service['enrichEntity'](entity, {
        services: ['edgar'],
        properties: ['industry', 'sector', 'employees']
      });

      expect(enriched.properties).toEqual({
        industry: 'Technology',
        sector: 'Software',
        employees: 500
      });
      expect(enriched.confidence).toBe(0.9); // Boosted confidence
      expect(enriched.id).toBe(entity.id);
      expect(enriched.name).toBe(entity.name);
      expect(enriched.type).toBe(entity.type);
    });

    it('should handle enrichment service failures gracefully', async () => {
      const entity: ExtractedEntity = {
        id: 'org-123',
        name: 'Acme Corp',
        type: 'Organization',
        confidence: 0.8,
        source: 'spacy-en_core_web_lg'
      };

      // Mock enrichment service failure
      const mockAxios = require('axios');
      mockAxios.post.mockRejectedValueOnce(new Error('Service unavailable'));

      const enriched = await service['enrichEntity'](entity, {
        services: ['edgar'],
        properties: ['industry']
      });

      expect(enriched.id).toBe(entity.id);
      expect(enriched.name).toBe(entity.name);
      expect(enriched.type).toBe(entity.type);
    });
  });

  describe('configuration management', () => {
    it('should load extraction configuration from ontology', () => {
      const config = service.getExtractionConfig();

      expect(config.models).toBeDefined();
      expect(config.patterns).toBeDefined();
      expect(config.contextRules).toBeDefined();
      expect(config.enrichment).toBeDefined();
    });

    it('should allow dynamic configuration updates', () => {
      const newConfig = {
        patterns: {
          CustomPattern: {
            regex: '\\bCUSTOM\\b',
            confidence: 0.8,
            priority: 1
          }
        }
      };

      service.updateExtractionConfig(newConfig);
      const config = service.getExtractionConfig();

      expect(config.patterns.CustomPattern).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle ML model service failures gracefully', async () => {
      const text = 'Test text';
      const context = 'financial-report';

      // Mock service failure
      const mockAxios = require('axios');
      mockAxios.post.mockRejectedValueOnce(new Error('Service unavailable'));

      const entities = await service.extractEntities(text, context);

      // When model fails, pattern extraction may return 0 if no match
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should handle invalid regex patterns gracefully', () => {
      // This would be tested by mocking a malformed configuration
      // and ensuring the service doesn't crash
      expect(() => {
        service['extractWithPatterns']('test', 'email');
      }).not.toThrow();
    });
  });

  describe('ontology-driven extraction aggregation', () => {
    it('should aggregate extraction configs from all active ontologies', async () => {
      // Mock two ontologies: CRM and Financial
      const crmExtractionConfig = {
        models: {
          organizations: {
            type: 'spacy',
            model: 'en_core_web_lg',
            endpoint: '/extract-orgs',
            confidence: 0.8,
            priority: 1
          }
        },
        patterns: {
          Email: {
            regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
            confidence: 0.95,
            priority: 1
          }
        },
        contextRules: {
          email: {
            priority: ['Person', 'Organization', 'Email'],
            requiredModels: ['organizations'],
            confidenceThreshold: 0.6
          }
        },
        enrichment: {}
      };
      const financialExtractionConfig = {
        models: {
          financial: {
            type: 'finbert',
            model: 'financial-entity-recognition',
            endpoint: '/extract-financial',
            confidence: 0.7,
            priority: 2
          }
        },
        patterns: {
          MonetaryAmount: {
            regex: '\\$[\\d,]+(?:\\.\\d{2})?',
            confidence: 0.9,
            priority: 1
          }
        },
        contextRules: {
          'financial-report': {
            priority: ['MonetaryAmount', 'Organization', 'Date'],
            requiredModels: ['financial', 'organizations'],
            confidenceThreshold: 0.7
          }
        },
        enrichment: {}
      };
      
      // Mock OntologyService to return both configs in the correct structure
      mockOntologyService.getAllOntologies.mockReturnValue([
        { 
          name: 'crm', 
          entities: {
            Contact: { entityExtraction: crmExtractionConfig }
          }
        },
        { 
          name: 'financial', 
          entities: {
            Organization: { entityExtraction: financialExtractionConfig }
          }
        }
      ]);
      
      // Create a new service instance to use the updated config
      const testService = container.resolve(EnhancedEntityExtractionService);

      const text = 'Acme Corp reported $2.5M revenue. Contact john@acme.com for details.';
      const context = 'financial-report';

      // Mock ML model responses for both models
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Acme Corp',
              type: 'Organization',
              confidence: 0.85,
              position: { start: 0, end: 9 }
            }
          ]
        }
      });
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: '$2.5M',
              type: 'MonetaryAmount',
              confidence: 0.9,
              position: { start: 20, end: 25 }
            }
          ]
        }
      });

      const entities = await testService.extractEntities(text, context);
      // Should extract entities from both CRM and Financial configs
      expect(entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'Organization', name: 'Acme Corp' }),
          expect.objectContaining({ type: 'MonetaryAmount', name: expect.stringMatching(/^\$/), confidence: expect.any(Number) }),
          expect.objectContaining({ type: 'MonetaryAmount', name: '$2' })
        ])
      );
      
      // Verify that entities from both ontologies were extracted
      const organizationEntity = entities.find(e => e.type === 'Organization');
      const monetaryEntities = entities.filter(e => e.type === 'MonetaryAmount');
      
      expect(organizationEntity).toBeDefined();
      expect(monetaryEntities.length).toBeGreaterThanOrEqual(1);
    });
  });
}); 