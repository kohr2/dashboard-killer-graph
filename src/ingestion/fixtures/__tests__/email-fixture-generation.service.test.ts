import { EmailFixtureGenerationService, SourceOntology, OntologyConfig, OntologyEntity, OntologyRelationship } from '../email-fixture-generation.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn()
  }
}));
jest.mock('path');
jest.mock('openai');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockJoin = join as jest.MockedFunction<typeof join>;
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('EmailFixtureGenerationService', () => {
  let service: EmailFixtureGenerationService;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup OpenAI mock
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    mockOpenAI.mockImplementation(() => mockOpenAIInstance);
    
    // Setup fs mocks
    mockFs.readFile.mockResolvedValue('mock file content');
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    
    // Setup path mock
    mockJoin.mockImplementation((...args) => args.join('/'));
    
    service = new EmailFixtureGenerationService();
  });

  describe('loadOntology', () => {
    it('should load ontology from JSON file', async () => {
      const mockOntologyData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            properties: { name: 'string', email: 'string' }
          }
        ],
        relationships: [
          {
            name: 'WORKS_FOR',
            description: { _: 'Employment relationship' },
            source: 'Person',
            target: 'Organization'
          }
        ]
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));

      const result = await service.loadOntology('test-ontology');

      expect(result).toEqual(mockOntologyData);
      expect(mockFs.readFile).toHaveBeenCalledWith('ontologies/test-ontology/ontology.json', 'utf-8');
    });

    it('should handle missing ontology file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.loadOntology('nonexistent-ontology'))
        .rejects.toThrow('File not found');
    });

    it('should handle invalid JSON in ontology file', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(service.loadOntology('test-ontology'))
        .rejects.toThrow();
    });
  });

  describe('loadOntologyConfig', () => {
    it('should load ontology config from JSON file', async () => {
      const mockConfigData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        emailGeneration: {
          currencies: ['USD', 'EUR'],
          locations: ['New York', 'London'],
          statuses: ['Active', 'Pending']
        }
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfigData));

      const result = await service.loadOntologyConfig('test-ontology');

      expect(result).toEqual(mockConfigData);
      expect(mockFs.readFile).toHaveBeenCalledWith('ontologies/test-ontology/config.json', 'utf-8');
    });

    it('should handle missing config file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.loadOntologyConfig('nonexistent-ontology'))
        .rejects.toThrow('File not found');
    });
  });

  describe('generatePeopleFromOntology', () => {
    it('should generate people from ontology entities', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            properties: { name: 'string', email: 'string' }
          },
          {
            name: 'Manager',
            description: { _: 'A manager entity' },
            properties: { name: 'string', email: 'string' }
          }
        ]
      };

      const result = (service as any).generatePeopleFromOntology(ontology);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('firstName');
      expect(result[0]).toHaveProperty('lastName');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('email');
      expect(result[0].title).toContain('Person');
      expect(result[1].title).toContain('Manager');
    });

    it('should handle ontology with no entities', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: []
      };

      const result = (service as any).generatePeopleFromOntology(ontology);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateTitleFromEntity', () => {
    it('should generate title from entity name', () => {
      const entity: OntologyEntity = {
        name: 'Person',
        description: { _: 'A person entity' }
      };

      const result = (service as any).generateTitleFromEntity(entity);

      expect(result).toContain('Person');
      expect(typeof result).toBe('string');
    });

    it('should handle entity with long name', () => {
      const entity: OntologyEntity = {
        name: 'VeryLongEntityNameThatExceedsNormalLength',
        description: { _: 'A very long entity name' }
      };

      const result = (service as any).generateTitleFromEntity(entity);

      expect(result).toContain('VeryLongEntityNameThatExceedsNormalLength');
    });
  });

  describe('extractRelevantEntities', () => {
    it('should extract entities with vectorIndex true', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            vectorIndex: true
          },
          {
            name: 'Organization',
            description: { _: 'An organization entity' },
            vectorIndex: false
          },
          {
            name: 'Deal',
            description: { _: 'A deal entity' },
            vectorIndex: true
          }
        ]
      };

      const result = (service as any).extractRelevantEntities(ontology);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Person');
      expect(result[1].name).toBe('Deal');
    });

    it('should return all entities when none have vectorIndex', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            vectorIndex: false
          },
          {
            name: 'Organization',
            description: { _: 'An organization entity' },
            vectorIndex: false
          }
        ]
      };

      const result = (service as any).extractRelevantEntities(ontology);

      expect(result).toHaveLength(2);
    });
  });

  describe('extractRelevantRelationships', () => {
    it('should extract relationships from ontology', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [],
        relationships: [
          {
            name: 'WORKS_FOR',
            description: { _: 'Employment relationship' },
            source: 'Person',
            target: 'Organization'
          },
          {
            name: 'OWNS',
            description: { _: 'Ownership relationship' },
            source: 'Person',
            target: 'Company'
          }
        ]
      };

      const result = (service as any).extractRelevantRelationships(ontology);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('WORKS_FOR');
      expect(result[1].name).toBe('OWNS');
    });

    it('should handle ontology with no relationships', () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [],
        relationships: []
      };

      const result = (service as any).extractRelevantRelationships(ontology);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateMockDataFromConfig', () => {
    it('should generate mock data from config', () => {
      const config: OntologyConfig = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        emailGeneration: {
          currencies: ['USD', 'EUR'],
          locations: ['New York', 'London'],
          statuses: ['Active', 'Pending'],
          emailTypes: ['Invoice', 'Contract'],
          categories: ['IT', 'Finance'],
          vendors: ['Vendor A', 'Vendor B']
        }
      };

      const result = (service as any).generateMockDataFromConfig(config);

      expect(result).toHaveProperty('referenceNumbers');
      expect(result).toHaveProperty('amounts');
      expect(result).toHaveProperty('currencies');
      expect(result).toHaveProperty('dates');
      expect(result).toHaveProperty('locations');
      expect(result).toHaveProperty('statuses');
      expect(result).toHaveProperty('emailTypes');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('vendors');
      
      expect(result.currencies).toEqual(['USD', 'EUR']);
      expect(result.locations).toEqual(['New York', 'London']);
      expect(result.statuses).toEqual(['Active', 'Pending']);
      expect(result.emailTypes).toEqual(['Invoice', 'Contract']);
      expect(result.categories).toEqual(['IT', 'Finance']);
      expect(result.vendors).toEqual(['Vendor A', 'Vendor B']);
    });

    it('should use default values when config is missing', () => {
      const config: OntologyConfig = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      const result = (service as any).generateMockDataFromConfig(config);

      expect(result.currencies).toHaveLength(3);
      expect(result.locations).toHaveLength(5);
      expect(result.statuses).toHaveLength(4);
      expect(result.emailTypes).toHaveLength(4);
      expect(result.categories).toHaveLength(5);
      expect(result.vendors).toHaveLength(5);
    });
  });

  describe('generateEmailWithLLM', () => {
    beforeEach(() => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              subject: 'Test Subject',
              body: 'Test Body'
            })
          }
        }]
      });
    });

    it('should generate email using LLM', async () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: []
      };

      const config: OntologyConfig = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      const result = await (service as any).generateEmailWithLLM(
        ontology,
        config,
        'Invoice',
        'Vendor A',
        'IT',
        'REF-001',
        '1000',
        'USD',
        { firstName: 'John', lastName: 'Doe', title: 'Manager', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', title: 'Analyst', email: 'jane@example.com' }
      );

      expect(result).toEqual({
        subject: 'Test Subject',
        body: 'Test Body'
      });
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle LLM API errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: []
      };

      const config: OntologyConfig = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      const result = await (service as any).generateEmailWithLLM(
        ontology,
        config,
        'Invoice',
        'Vendor A',
        'IT',
        'REF-001',
        '1000',
        'USD',
        { firstName: 'John', lastName: 'Doe', title: 'Manager', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', title: 'Analyst', email: 'jane@example.com' }
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result.subject).toContain('Invoice');
      expect(result.body).toContain('Vendor A');
    });
  });

  describe('generateFallbackEmail', () => {
    it('should generate fallback email', () => {
      const result = (service as any).generateFallbackEmail(
        'Invoice',
        'Vendor A',
        'IT',
        { firstName: 'John', lastName: 'Doe', title: 'Manager', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', title: 'Analyst', email: 'jane@example.com' }
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result.subject).toContain('Invoice');
      expect(result.body).toContain('Vendor A');
      expect(result.body).toContain('John Doe');
      expect(result.body).toContain('Jane Smith');
    });
  });

  describe('slugify', () => {
    it('should slugify text correctly', () => {
      const result = (service as any).slugify('Test Email Subject');
      expect(result).toBe('test-email-subject');
    });

    it('should handle special characters', () => {
      const result = (service as any).slugify('Test & Email (Subject)');
      expect(result).toBe('test-email-subject');
    });

    it('should handle multiple spaces', () => {
      const result = (service as any).slugify('Test   Email   Subject');
      expect(result).toBe('test-email-subject');
    });
  });

  describe('random', () => {
    it('should return random item from array', () => {
      const array = ['a', 'b', 'c'];
      const result = (service as any).random(array);
      expect(array).toContain(result);
    });

    it('should handle empty array', () => {
      const result = (service as any).random([]);
      expect(result).toBeUndefined();
    });
  });

  describe('buildEmail', () => {
    beforeEach(() => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              subject: 'Test Subject',
              body: 'Test Body'
            })
          }
        }]
      });
    });

    it('should build email successfully', async () => {
      const ontology: SourceOntology = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: []
      };

      const config: OntologyConfig = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      const result = await (service as any).buildEmail(ontology, config, 1);

      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('content');
      expect(result.filename).toContain('test-ontology');
      expect(result.filename).toContain('1');
      expect(result.content).toContain('From:');
      expect(result.content).toContain('To:');
      expect(result.content).toContain('Subject:');
    });
  });

  describe('generateEmailFixtures', () => {
    beforeEach(() => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              subject: 'Test Subject',
              body: 'Test Body'
            })
          }
        }]
      });
    });

    it('should generate multiple email fixtures', async () => {
      const mockOntologyData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            vectorIndex: true
          }
        ]
      };

      const mockConfigData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockOntologyData))
        .mockResolvedValueOnce(JSON.stringify(mockConfigData));

      const result = await service.generateEmailFixtures({
        ontologyName: 'test-ontology',
        count: 2,
        outputDir: '/test/output'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('test-ontology');
      expect(result[1]).toContain('test-ontology');
    });

    it('should handle generation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.generateEmailFixtures({
        ontologyName: 'nonexistent-ontology',
        count: 1
      })).rejects.toThrow('File not found');
    });
  });

  describe('generateSingleEmailFixture', () => {
    beforeEach(() => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              subject: 'Test Subject',
              body: 'Test Body'
            })
          }
        }]
      });
    });

    it('should generate single email fixture', async () => {
      const mockOntologyData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        },
        entities: [
          {
            name: 'Person',
            description: { _: 'A person entity' },
            vectorIndex: true
          }
        ]
      };

      const mockConfigData = {
        name: 'test-ontology',
        source: {
          url: 'http://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test ontology'
        }
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockOntologyData))
        .mockResolvedValueOnce(JSON.stringify(mockConfigData));

      const result = await service.generateSingleEmailFixture('test-ontology');

      expect(result).toContain('test-ontology');
      expect(result).toContain('.eml');
    });

    it('should handle generation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.generateSingleEmailFixture('nonexistent-ontology'))
        .rejects.toThrow('File not found');
    });
  });
}); 