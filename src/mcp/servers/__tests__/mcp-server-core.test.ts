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
  mcpUser
} from '../mcp-server-core';
import { OntologyService } from '../../../platform/ontology/ontology.service';
import { ChatService } from '../../../platform/chat/application/services/chat.service';
import { Neo4jConnection } from '../../../platform/database/neo4j-connection';
import { NLPServiceClient } from '../../../platform/processing/nlp-service.client';
import { container } from 'tsyringe';
import { pluginRegistry } from '../../../../config/ontology/plugins.config';

// Mock dependencies
jest.mock('tsyringe');
jest.mock('../../../../config/ontology/plugins.config');
jest.mock('fs');
jest.mock('path');

const mockContainer = {
  resolve: jest.fn(),
};


const mockOntologyService = {
  getAllOntologies: jest.fn(),
  getAllEntityTypes: jest.fn(),
  getAllRelationshipTypes: jest.fn(),
};

const mockChatService = {
  handleQuery: jest.fn(),
};

const mockNeo4jConnection = {
  getCurrentDatabase: jest.fn(),
};

const mockNLPServiceClient = {
  processOperation: jest.fn(),
};

const mockPluginRegistry = {
  getPluginSummary: jest.fn(),
};

describe('MCP Server Core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.NEO4J_DATABASE = 'test-db';

    // Set up the container mock to return our mockOntologyService
    const { container } = require('tsyringe');
    container.resolve.mockImplementation((service: any) => {
      if (service && (service.name === 'OntologyService' || service.toString().includes('OntologyService'))) {
        return mockOntologyService;
      }
      return undefined;
    });

    // Setup container mock
    (container as any).resolve = mockContainer.resolve;
    
    // Setup plugin registry mock
    (pluginRegistry as any) = mockPluginRegistry;

  });

  afterEach(() => {
    delete process.env.NEO4J_DATABASE;
  });

  describe('loadOntologyEntities', () => {
    const mockFs = require('fs');
    const mockPath = require('path');

    beforeEach(() => {
      mockPath.join.mockReturnValue('/test/path/ontology.json');
    });

    it('should load ontology entities from JSON file', () => {
      const mockOntologyData = {
        entities: {
          'Entity1': { name: 'Entity1', properties: {} },
          'Entity2': { name: 'Entity2', properties: {} }
        }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyData));

      const result = loadOntologyEntities('test-ontology');

      expect(result).toEqual(mockOntologyData.entities);
      expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'ontologies', 'test-ontology', 'ontology.json');
    });

    it('should return empty object when ontology file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadOntologyEntities('nonexistent-ontology');

      expect(result).toEqual({});
    });

    it('should return empty object when ontology file is invalid JSON', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = loadOntologyEntities('test-ontology');

      expect(result).toEqual({});
    });

    it('should return empty object when ontology data has no entities', () => {
      const mockOntologyData = { otherData: 'value' };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyData));

      const result = loadOntologyEntities('test-ontology');

      expect(result).toEqual({});
    });
  });

  describe('generateOntologyExamples', () => {
    it('should generate examples for ontology with vector-indexed entities', () => {
      const entities = {
        'Person': { vectorIndex: true },
        'Organization': { vectorIndex: true },
        'Deal': { vectorIndex: false },
        'Contact': { vectorIndex: true }
      };

      const result = generateOntologyExamples('test-ontology', entities);

      expect(result).toContain('Person');
      expect(result).toContain('Organization');
      expect(result).toContain('Contact');
      expect(result).not.toContain('Deal');
      expect(result).toContain('test-ontology');
    });

    it('should fallback to any entities when no vector-indexed entities exist', () => {
      const entities = {
        'Person': { vectorIndex: false },
        'Organization': { vectorIndex: false },
        'Deal': { vectorIndex: false }
      };

      const result = generateOntologyExamples('test-ontology', entities);

      expect(result).toContain('Person');
      expect(result).toContain('Organization');
      expect(result).toContain('Deal');
    });

    it('should return empty string when no entities exist', () => {
      const result = generateOntologyExamples('test-ontology', {});

      expect(result).toBe('');
    });

    it('should limit examples to 3-4 entities', () => {
      const entities = {
        'Entity1': { vectorIndex: true },
        'Entity2': { vectorIndex: true },
        'Entity3': { vectorIndex: true },
        'Entity4': { vectorIndex: true },
        'Entity5': { vectorIndex: true },
        'Entity6': { vectorIndex: true }
      };

      const result = generateOntologyExamples('test-ontology', entities);

      // Should only include first 4 entities
      expect(result).toContain('Entity1');
      expect(result).toContain('Entity2');
      expect(result).toContain('Entity3');
      expect(result).toContain('Entity4');
      expect(result).not.toContain('Entity5');
      expect(result).not.toContain('Entity6');
    });
  });

  describe('generateToolDescription', () => {
    beforeEach(() => {
      mockPluginRegistry.getPluginSummary.mockReturnValue({
        enabled: ['fibo', 'procurement', 'core']
      });
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Organization', 'Deal']);
      mockOntologyService.getAllRelationshipTypes.mockReturnValue(['WORKS_FOR', 'OWNS']);
    });

    it('should generate tool description with active ontologies', () => {
      const result = generateToolDescription(mockOntologyService as any, mockNeo4jConnection as any);

      expect(result).toContain('fibo');
      expect(result).toContain('procurement');
      expect(result).toContain('test-db');
      expect(result).toContain('3 types available');
      expect(result).toContain('2 types available');
      expect(result).toContain('show all [EntityType]');
      expect(result).toContain('find [EntityName]');
    });

    it('should handle empty entity and relationship types', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue([]);
      mockOntologyService.getAllRelationshipTypes.mockReturnValue([]);

      const result = generateToolDescription(mockOntologyService as any, mockNeo4jConnection as any);

      expect(result).toContain('0 types available');
    });

    it('should use default database when NEO4J_DATABASE is not set', () => {
      delete process.env.NEO4J_DATABASE;

      const result = generateToolDescription(mockOntologyService as any, mockNeo4jConnection as any);

      expect(result).toContain('neo4j');
    });
  });

  describe('generateNLPToolDescription', () => {
    beforeEach(() => {
      mockContainer.resolve.mockReturnValue(mockOntologyService);
      mockOntologyService.getAllOntologies.mockReturnValue([
        { name: 'fibo', entities: [{ name: 'Person' }, { name: 'Organization' }] },
        { name: 'procurement', entities: [{ name: 'Deal' }] }
      ]);
    });

    it('should generate NLP tool description with ontology information', () => {
      const result = generateNLPToolDescription();

      expect(result).toContain('fibo');
      expect(result).toContain('procurement');
      expect(result).toContain('Person');
      expect(result).toContain('Organization');
      expect(result).toContain('Deal');
    });

    it('should handle ontologies with no entities', () => {
      mockOntologyService.getAllOntologies.mockReturnValue([
        { name: 'empty-ontology', entities: [] }
      ]);

      const result = generateNLPToolDescription();

      expect(result).toContain('empty-ontology');
      expect(result).toContain('0 entities');
    });

    it('should handle missing entities property', () => {
      mockOntologyService.getAllOntologies.mockReturnValue([
        { name: 'no-entities-ontology' }
      ]);

      const result = generateNLPToolDescription();

      expect(result).toContain('no-entities-ontology');
      expect(result).toContain('0 entities');
    });
  });

  describe('configureActiveOntologies', () => {
    it('should configure active ontologies', () => {
      configureActiveOntologies();

      expect(mockPluginRegistry.getPluginSummary).toHaveBeenCalled();
    });
  });

  describe('initializeCoreServices', () => {
    beforeEach(() => {
      mockContainer.resolve
        .mockReturnValueOnce(mockOntologyService)
        .mockReturnValueOnce(mockNeo4jConnection);
    });

    it('should initialize core services successfully', async () => {
      const result = await initializeCoreServices();

      expect(mockContainer.resolve).toHaveBeenCalledWith('OntologyService');
      expect(mockContainer.resolve).toHaveBeenCalledWith('Neo4jConnection');
      expect(result).toEqual({
        ontologyService: mockOntologyService,
        neo4jConnection: mockNeo4jConnection
      });
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockContainer.resolve.mockImplementation(() => {
        throw error;
      });

      await expect(initializeCoreServices()).rejects.toThrow('Initialization failed');
    });
  });

  describe('initializeNLPService', () => {
    beforeEach(() => {
      mockContainer.resolve.mockReturnValue(mockNLPServiceClient);
    });

    it('should initialize NLP service successfully', async () => {
      const result = await initializeNLPService();

      expect(mockContainer.resolve).toHaveBeenCalledWith('NLPServiceClient');
      expect(result).toBe(mockNLPServiceClient);
    });

    it('should return null when NLP service is not available', async () => {
      mockContainer.resolve.mockImplementation(() => {
        throw new Error('NLP service not found');
      });

      const result = await initializeNLPService();

      expect(result).toBeNull();
    });
  });

  describe('processKnowledgeGraphQuery', () => {
    beforeEach(() => {
      mockChatService.handleQuery.mockResolvedValue({
        content: 'Query result',
        query: 'MATCH (n) RETURN n'
      });
    });

    it('should process knowledge graph query successfully', async () => {
      const result = await processKnowledgeGraphQuery(mockChatService as any, 'test query');

      expect(mockChatService.handleQuery).toHaveBeenCalledWith('test query', mcpUser);
      expect(result).toEqual({
        content: 'Query result',
        query: 'MATCH (n) RETURN n'
      });
    });

    it('should process query with custom user', async () => {
      const customUser = { id: 'custom-user', username: 'custom' };
      
      await processKnowledgeGraphQuery(mockChatService as any, 'test query', customUser);

      expect(mockChatService.handleQuery).toHaveBeenCalledWith('test query', customUser);
    });

    it('should handle query processing errors', async () => {
      const error = new Error('Query failed');
      mockChatService.handleQuery.mockRejectedValue(error);

      await expect(processKnowledgeGraphQuery(mockChatService as any, 'test query'))
        .rejects.toThrow('Query failed');
    });
  });

  describe('processNLPOperation', () => {
    beforeEach(() => {
      mockNLPServiceClient.processOperation.mockResolvedValue({
        result: 'NLP operation result'
      });
    });

    it('should process NLP operation successfully', async () => {
      const result = await processNLPOperation(mockNLPServiceClient as any, 'analyze', 'test text');

      expect(mockNLPServiceClient.processOperation).toHaveBeenCalledWith('analyze', 'test text');
      expect(result).toEqual({ result: 'NLP operation result' });
    });

    it('should process operation with multiple texts', async () => {
      const texts = ['text1', 'text2'];
      
      await processNLPOperation(mockNLPServiceClient as any, 'compare', undefined, texts);

      expect(mockNLPServiceClient.processOperation).toHaveBeenCalledWith('compare', undefined, texts);
    });

    it('should process operation with ontology name', async () => {
      await processNLPOperation(mockNLPServiceClient as any, 'extract', 'text', undefined, 'fibo');

      expect(mockNLPServiceClient.processOperation).toHaveBeenCalledWith('extract', 'text', undefined, 'fibo');
    });

    it('should handle NLP operation errors', async () => {
      const error = new Error('NLP operation failed');
      mockNLPServiceClient.processOperation.mockRejectedValue(error);

      await expect(processNLPOperation(mockNLPServiceClient as any, 'analyze', 'test text'))
        .rejects.toThrow('NLP operation failed');
    });
  });

  describe('getToolSchemas', () => {
    beforeEach(() => {
      mockPluginRegistry.getPluginSummary.mockReturnValue({
        enabled: ['fibo', 'procurement']
      });
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Organization']);
      mockOntologyService.getAllRelationshipTypes.mockReturnValue(['WORKS_FOR']);
    });

    it('should return tool schemas with descriptions', () => {
      const result = getToolSchemas(mockOntologyService as any, mockNeo4jConnection as any);

      expect(result).toHaveProperty('query_knowledge_graph');
      expect(result).toHaveProperty('nlp_processing');
      expect(result.query_knowledge_graph.name).toBe('query_knowledge_graph');
      expect(result.nlp_processing.name).toBe('nlp_processing');
      expect(result.query_knowledge_graph.description).toContain('fibo');
      expect(result.query_knowledge_graph.description).toContain('procurement');
    });

    it('should include database parameter in knowledge graph query schema', () => {
      const result = getToolSchemas(mockOntologyService as any, mockNeo4jConnection as any);

      const kgQuerySchema = result.query_knowledge_graph;
      expect(kgQuerySchema).toBeDefined();
      
      const databaseParam = kgQuerySchema?.inputSchema.properties?.database;
      expect(databaseParam).toBeDefined();
      expect(databaseParam?.type).toBe('string');
      expect(databaseParam?.description).toContain('database');
    });

    it('should include required parameters in NLP operation schema', () => {
      const result = getToolSchemas(mockOntologyService as any, mockNeo4jConnection as any);

      const nlpSchema = result.nlp_processing;
      expect(nlpSchema).toBeDefined();
      
      const operationParam = nlpSchema?.inputSchema.properties?.operation;
      expect(operationParam).toBeDefined();
      expect(operationParam?.type).toBe('string');
      expect(operationParam?.enum).toContain('extract_entities');
    });
  });

  describe('getServerInfo', () => {
    it('should return server information', () => {
      const result = getServerInfo();

      expect(result).toEqual({
        name: 'knowledge-graph-mcp-server',
        version: '1.0.0',
        capabilities: {
          tools: {}
        }
      });
    });
  });

  describe('mcpUser', () => {
    it('should have correct user structure', () => {
      expect(mcpUser).toEqual({
        id: 'mcp-server-user',
        username: 'mcp-server',
        roles: [
          {
            name: 'admin',
            permissions: [{ action: '*', resource: '*' }]
          }
        ]
      });
    });
  });
}); 