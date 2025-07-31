import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { NLPServiceClient } from '@platform/processing/nlp-service.client';
import { ReasoningOrchestratorService } from '@platform/reasoning/reasoning-orchestrator.service';
import { logger } from '@shared/utils/logger';
import {
  loadOntologyEntities,
  generateOntologyExamples,
  generateToolDescription,
  generateNLPToolDescription,
  configureActiveOntologies,
  initializeCoreServices,
  initializeNLPService,
  processKnowledgeGraphQuery,
  processNLPOperation,
  getToolSchemas,
  getServerInfo,
  mcpUser,
} from '../mcp-server-core';

// Mock dependencies
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
}));

jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/chat/application/services/chat.service');
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/processing/nlp-service.client');
jest.mock('@platform/reasoning/reasoning-orchestrator.service');
jest.mock('@shared/utils/logger');
jest.mock('../../../config/ontology/plugins.config', () => ({
  pluginRegistry: {
    getPluginSummary: jest.fn().mockReturnValue({
      enabled: ['procurement', 'fibo'],
    }),
  },
}));

const mockContainer = container as jest.Mocked<typeof container>;
const mockOntologyService = OntologyService as jest.MockedClass<typeof OntologyService>;
const mockChatService = ChatService as jest.MockedClass<typeof ChatService>;
const mockNeo4jConnection = Neo4jConnection as jest.MockedClass<typeof Neo4jConnection>;
const mockNLPServiceClient = NLPServiceClient as jest.MockedClass<typeof NLPServiceClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('MCP Server Core', () => {
  let mockOntologyServiceInstance: jest.Mocked<OntologyService>;
  let mockChatServiceInstance: jest.Mocked<ChatService>;
  let mockNeo4jConnectionInstance: jest.Mocked<Neo4jConnection>;
  let mockNLPServiceClientInstance: jest.Mocked<NLPServiceClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockOntologyServiceInstance = {
      getAllEntityTypes: jest.fn().mockReturnValue(['Person', 'Company']),
      getAllRelationshipTypes: jest.fn().mockReturnValue(['WORKS_FOR', 'OWNS']),
    } as any;

    mockChatServiceInstance = {
      processQuery: jest.fn(),
      handleQuery: jest.fn(),
    } as any;

    mockNeo4jConnectionInstance = {
      connect: jest.fn(),
      close: jest.fn(),
    } as any;

          mockNLPServiceClientInstance = {
        extractGraph: jest.fn(),
        extractEntities: jest.fn(),
        refineEntities: jest.fn(),
        batchExtractGraph: jest.fn(),
        generateEmbeddings: jest.fn(),
        healthCheck: jest.fn(),
        getAvailableOntologies: jest.fn(),
      } as any;

    // Setup container mocks
    mockContainer.resolve.mockImplementation((token) => {
      if (token === OntologyService) return mockOntologyServiceInstance;
      if (token === ChatService) return mockChatServiceInstance;
      if (token === Neo4jConnection) return mockNeo4jConnectionInstance;
      if (token === NLPServiceClient) return mockNLPServiceClientInstance;
      return {};
    });
  });

  describe('loadOntologyEntities', () => {
    it('should load ontology entities from JSON file', () => {
      // Mock fs and path
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue(JSON.stringify({
          entities: {
            Person: { name: 'Person', properties: {} },
            Company: { name: 'Company', properties: {} },
          },
        })),
      };
      
      jest.doMock('fs', () => mockFs);
      jest.doMock('path', () => ({
        join: jest.fn().mockReturnValue('/path/to/ontology.json'),
      }));

      const result = loadOntologyEntities('test-ontology');

      expect(result).toEqual({
        Person: { name: 'Person', properties: {} },
        Company: { name: 'Company', properties: {} },
      });
    });

    it('should return empty object when file does not exist', () => {
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(false),
      };
      
      jest.doMock('fs', () => mockFs);

      const result = loadOntologyEntities('non-existent');

      expect(result).toEqual({});
    });

    it('should handle JSON parsing errors', () => {
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockImplementation(() => {
          throw new Error('Invalid JSON');
        }),
      };
      
      jest.doMock('fs', () => mockFs);

      const result = loadOntologyEntities('invalid-ontology');

      expect(result).toEqual({});
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('generateOntologyExamples', () => {
    it('should generate examples for ontology entities', () => {
      const entities = {
        Person: { vectorIndex: true },
        Company: { vectorIndex: true },
        Product: { vectorIndex: false },
      };

      const result = generateOntologyExamples('test', entities);

      expect(result).toContain('Test Queries');
      expect(result).toContain('"show all Person"');
      expect(result).toContain('"show all Company"');
    });

    it('should handle empty entities', () => {
      const result = generateOntologyExamples('test', {});

      expect(result).toBe('');
    });

    it('should fallback to any entities when no vectorIndex entities', () => {
      const entities = {
        Person: { vectorIndex: false },
        Company: { vectorIndex: false },
        Product: { vectorIndex: false },
      };

      const result = generateOntologyExamples('test', entities);

      expect(result).toContain('Test Queries');
    });
  });

  describe('generateToolDescription', () => {
    it('should generate tool description with ontology information', () => {
      const result = generateToolDescription(mockOntologyServiceInstance, mockNeo4jConnectionInstance);

      expect(result).toContain('Query the knowledge graph');
      expect(result).toContain('Active Ontologies');
      expect(result).toContain('procurement, fibo');
      expect(result).toContain('Entity Types');
      expect(result).toContain('Relationship Types');
      expect(result).toContain('Common Query Patterns');
    });
  });

  describe('generateNLPToolDescription', () => {
    it('should generate NLP tool description', () => {
      const result = generateNLPToolDescription();

      expect(result).toContain('NLP Operations');
      expect(result).toContain('entity_extraction');
      expect(result).toContain('relationship_extraction');
    });
  });

  describe('configureActiveOntologies', () => {
    it('should configure active ontologies', () => {
      // This function doesn't return anything, just test it doesn't throw
      expect(() => configureActiveOntologies()).not.toThrow();
    });
  });

  describe('initializeCoreServices', () => {
    it('should initialize core services successfully', async () => {
      const result = await initializeCoreServices();

      expect(result).toBeDefined();
      expect(mockContainer.resolve).toHaveBeenCalledWith(OntologyService);
      expect(mockContainer.resolve).toHaveBeenCalledWith(ChatService);
      expect(mockContainer.resolve).toHaveBeenCalledWith(Neo4jConnection);
    });
  });

  describe('initializeNLPService', () => {
    it('should initialize NLP service successfully', async () => {
      const result = await initializeNLPService();

      expect(result).toBeDefined();
      expect(mockContainer.resolve).toHaveBeenCalledWith(NLPServiceClient);
    });
  });

  describe('processKnowledgeGraphQuery', () => {
    it('should process knowledge graph query', async () => {
      mockChatServiceInstance.processQuery.mockResolvedValue({
        answer: 'Query result',
        data: undefined,
      });

      const result = await processKnowledgeGraphQuery(
        mockChatServiceInstance,
        'show all Person',
        mcpUser
      );

      expect(result).toEqual({
        answer: 'Query result',
        data: undefined,
      });
      expect(mockChatServiceInstance.processQuery).toHaveBeenCalledWith(
        'show all Person',
        mcpUser
      );
    });
  });

  describe('processNLPOperation', () => {
    it('should process NLP operation', async () => {
      mockNLPServiceClientInstance.extractEntities.mockResolvedValue([
        { type: 'Person', value: 'John', confidence: 0.9 },
      ]);

      const result = await processNLPOperation(
        mockNLPServiceClientInstance,
        'entity_extraction',
        'John works at Company',
        undefined,
        'test-ontology'
      );

      expect(result).toEqual([
        { type: 'Person', value: 'John', confidence: 0.9 },
      ]);
      expect(mockNLPServiceClientInstance.extractEntities).toHaveBeenCalled();
    });
  });

  describe('getToolSchemas', () => {
    it('should return tool schemas', () => {
      const result = getToolSchemas(mockOntologyServiceInstance, mockNeo4jConnectionInstance);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getServerInfo', () => {
    it('should return server information', () => {
      const result = getServerInfo();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('version');
    });
  });

  describe('mcpUser', () => {
    it('should have correct user properties', () => {
      expect(mcpUser).toEqual({
        id: 'mcp-server-user',
        username: 'mcp-server',
        roles: [
          {
            name: 'admin',
            permissions: [{ action: '*', resource: '*' }],
          },
        ],
      });
    });
  });
}); 