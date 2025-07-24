import { 
  mcpUser,
  loadOntologyEntities,
  generateOntologyExamples,
  generateToolDescription,
  generateNLPToolDescription,
  configureActiveOntologies,
  processKnowledgeGraphQuery,
  processNLPOperation,
  getToolSchemas,
  getServerInfo
} from '../mcp-server-core';

import { UNIFIED_TEST_DATABASE } from '@shared/constants/test-database';

// Mock dependencies
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../bootstrap', () => ({
  bootstrap: jest.fn()
}));

jest.mock('../../../../config/ontology/plugins.config', () => ({
  pluginRegistry: {
    disableAllPlugins: jest.fn(),
    setPluginEnabled: jest.fn(),
    getPluginSummary: jest.fn(() => ({
      enabled: ['procurement', 'fibo']
    }))
  }
}));

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((service: any) => {
      // This will be replaced in beforeEach
      return undefined;
    })
  },
  singleton: jest.fn(() => (target: any) => target),
  injectable: jest.fn(() => (target: any) => target)
}));

// Mock OntologyService
const mockOntologyService = {
  getAllOntologies: jest.fn().mockReturnValue([
    {
      name: 'financial',
      entities: [
        { name: 'Company', type: 'node' },
        { name: 'Person', type: 'node' },
        { name: 'Deal', type: 'node' }
      ]
    },
    {
      name: 'procurement',
      entities: [
        { name: 'Contract', type: 'node' },
        { name: 'Supplier', type: 'node' },
        { name: 'Tender', type: 'node' }
      ]
    }
  ])
};

jest.mock('@platform/ontology/ontology.service', () => ({
  OntologyService: {
    getInstance: jest.fn(() => mockOntologyService)
  }
}));

jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/processing/nlp-service.client');

describe('MCP Server Core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the container mock to return our mockOntologyService
    const { container } = require('tsyringe');
    container.resolve.mockImplementation((service: any) => {
      if (service && (service.name === 'OntologyService' || service.toString().includes('OntologyService'))) {
        return mockOntologyService;
      }
      return undefined;
    });
  });

  describe('mcpUser', () => {
    it('should have correct structure', () => {
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

  describe('loadOntologyEntities', () => {
    it('should load ontology entities from JSON file', () => {
      const mockFs = require('fs');
      const mockPath = require('path');
      
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      jest.spyOn(mockFs, 'readFileSync').mockReturnValue(JSON.stringify({
        entities: {
          Contract: { name: 'Contract', vectorIndex: true },
          Tender: { name: 'Tender', vectorIndex: true }
        }
      }));
      jest.spyOn(mockPath, 'join').mockReturnValue('/mock/path');

      const result = loadOntologyEntities('procurement');
      
      expect(result).toEqual({
        Contract: { name: 'Contract', vectorIndex: true },
        Tender: { name: 'Tender', vectorIndex: true }
      });
    });

    it('should return empty object if file does not exist', () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(false);

      const result = loadOntologyEntities('nonexistent');
      
      expect(result).toEqual({});
    });

    it('should handle JSON parsing errors gracefully', () => {
      const mockFs = require('fs');
      const mockPath = require('path');
      
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => {
        throw new Error('Invalid JSON');
      });
      jest.spyOn(mockPath, 'join').mockReturnValue('/mock/path');

      const result = loadOntologyEntities('procurement');
      
      expect(result).toEqual({});
    });
  });

  describe('generateOntologyExamples', () => {
    it('should generate examples from entities with vectorIndex', () => {
      const entities = {
        Contract: { vectorIndex: true },
        Tender: { vectorIndex: true },
        EconomicOperator: { vectorIndex: false },
        ContractingAuthority: { vectorIndex: true }
      };

      const result = generateOntologyExamples('procurement', entities);
      
      expect(result).toContain('**Procurement Queries**:');
      expect(result).toContain('"show all Contract"');
      expect(result).toContain('"show all Tender"');
      expect(result).toContain('"show all ContractingAuthority"');
      expect(result).not.toContain('EconomicOperator');
    });

    it('should fallback to any entities if no vectorIndex entities', () => {
      const entities = {
        Contract: { vectorIndex: false },
        Tender: { vectorIndex: false }
      };

      const result = generateOntologyExamples('procurement', entities);
      
      expect(result).toContain('**Procurement Queries**:');
      expect(result).toContain('"show all Contract"');
      expect(result).toContain('"show all Tender"');
    });

    it('should return empty string for empty entities', () => {
      const result = generateOntologyExamples('procurement', {});
      
      expect(result).toBe('');
    });
  });

  describe('generateToolDescription', () => {
    it('should generate description with active ontologies', () => {
      const mockOntologyService = {
        getAllEntityTypes: jest.fn(() => ['Contract', 'Tender', 'EconomicOperator']),
        getAllRelationshipTypes: jest.fn(() => ['hasContractingAuthority', 'hasAward'])
      };
      const mockNeo4jConnection = {};

      const result = generateToolDescription(mockOntologyService as any, mockNeo4jConnection as any);
      
      expect(result).toContain('Query the knowledge graph with 2 active ontologies');
      expect(result).toContain('**Active Ontologies**: procurement, fibo');
      expect(result).toContain('**Entity Types**: 3 types available');
      expect(result).toContain('**Relationship Types**: 2 types available');
      expect(result).toContain('"show all [EntityType]"');
      expect(result).toContain('Results are automatically limited to 10 items');
    });
  });

  describe('generateNLPToolDescription', () => {
    it('should generate NLP tool description', () => {
      const result = generateNLPToolDescription();
      
      expect(result).toContain('Process text using Natural Language Processing');
      expect(result).toContain('Entity extraction (raw spaCy)');
      expect(result).toContain('Knowledge graph extraction');
      expect(result).toContain('financial: Companies, people, monetary amounts');
      expect(result).toContain('procurement: Contracts, suppliers, amounts');
      expect(result).toContain('"extract entities from [text]"');
    });
  });

  describe('configureActiveOntologies', () => {
    it('should configure ontologies from environment variable', () => {
      const originalEnv = process.env.MCP_ACTIVE_ONTOLOGIES;
      process.env.MCP_ACTIVE_ONTOLOGIES = 'procurement,fibo';
      
      const { pluginRegistry } = require('../../../../config/ontology/plugins.config');
      
      configureActiveOntologies();
      
      expect(pluginRegistry.disableAllPlugins).toHaveBeenCalled();
      expect(pluginRegistry.setPluginEnabled).toHaveBeenCalledWith('procurement', true);
      expect(pluginRegistry.setPluginEnabled).toHaveBeenCalledWith('fibo', true);
      
      process.env.MCP_ACTIVE_ONTOLOGIES = originalEnv;
    });

    it('should do nothing if MCP_ACTIVE_ONTOLOGIES is not set', () => {
      const originalEnv = process.env.MCP_ACTIVE_ONTOLOGIES;
      delete process.env.MCP_ACTIVE_ONTOLOGIES;
      
      const { pluginRegistry } = require('../../../../config/ontology/plugins.config');
      
      configureActiveOntologies();
      
      expect(pluginRegistry.disableAllPlugins).not.toHaveBeenCalled();
      expect(pluginRegistry.setPluginEnabled).not.toHaveBeenCalled();
      
      process.env.MCP_ACTIVE_ONTOLOGIES = originalEnv;
    });
  });

  describe('processKnowledgeGraphQuery', () => {
    it('should process query with automatic limit', async () => {
      const mockChatService = {
        handleQuery: jest.fn().mockResolvedValue('Query result')
      };

      const result = await processKnowledgeGraphQuery(mockChatService as any, 'show all contracts');
      
      expect(mockChatService.handleQuery).toHaveBeenCalledWith(mcpUser, 'show all contracts LIMIT 10', undefined);
      expect(result).toEqual({
        content: 'Query result',
        query: 'show all contracts LIMIT 10'
      });
    });

    it('should not add limit if already present', async () => {
      const mockChatService = {
        handleQuery: jest.fn().mockResolvedValue('Query result')
      };

      const result = await processKnowledgeGraphQuery(mockChatService as any, 'show all contracts LIMIT 5');
      
      expect(mockChatService.handleQuery).toHaveBeenCalledWith(mcpUser, 'show all contracts LIMIT 5', undefined);
      expect(result.query).toBe('show all contracts LIMIT 5');
    });

    it('should throw error for invalid query', async () => {
      const mockChatService = {
        handleQuery: jest.fn()
      };

      await expect(processKnowledgeGraphQuery(mockChatService as any, '')).rejects.toThrow('Query parameter is required and must be a string');
      await expect(processKnowledgeGraphQuery(mockChatService as any, null as any)).rejects.toThrow('Query parameter is required and must be a string');
    });
  });

  describe('processNLPOperation', () => {
    it('should process extract_entities operation', async () => {
      const mockNlpClient = {
        extractEntities: jest.fn().mockResolvedValue({ entities: [] })
      };

      const result = await processNLPOperation(mockNlpClient as any, 'extract_entities', 'test text', undefined, 'procurement');
      
      expect(mockNlpClient.extractEntities).toHaveBeenCalledWith('test text', 'procurement');
      expect(result).toEqual({ entities: [] });
    });

    it('should process extract_graph operation', async () => {
      const mockNlpClient = {
        extractGraph: jest.fn().mockResolvedValue({ entities: [], relationships: [] })
      };

      const result = await processNLPOperation(mockNlpClient as any, 'extract_graph', 'test text', undefined, 'procurement');
      
      expect(mockNlpClient.extractGraph).toHaveBeenCalledWith('test text', 'procurement');
      expect(result).toEqual({ entities: [], relationships: [] });
    });

    it('should process batch_extract_graph operation', async () => {
      const mockNlpClient = {
        batchExtractGraph: jest.fn().mockResolvedValue({ results: [] })
      };

      const result = await processNLPOperation(mockNlpClient as any, 'batch_extract_graph', undefined, ['text1', 'text2'], 'procurement');
      
      expect(mockNlpClient.batchExtractGraph).toHaveBeenCalledWith(['text1', 'text2'], 'procurement');
      expect(result).toEqual({ results: [] });
    });

    it('should throw error for missing operation', async () => {
      const mockNlpClient = {};

      await expect(processNLPOperation(mockNlpClient as any, '', 'test')).rejects.toThrow('Operation parameter is required');
    });

    it('should throw error for unknown operation', async () => {
      const mockNlpClient = {};

      await expect(processNLPOperation(mockNlpClient as any, 'unknown_op', 'test')).rejects.toThrow('Unknown operation: unknown_op');
    });

    it('should throw error for missing text in single-text operations', async () => {
      const mockNlpClient = {};

      await expect(processNLPOperation(mockNlpClient as any, 'extract_entities')).rejects.toThrow('Text parameter is required for extract_entities operation');
    });

    it('should throw error for missing texts in batch operations', async () => {
      const mockNlpClient = {};

      await expect(processNLPOperation(mockNlpClient as any, 'batch_extract_graph')).rejects.toThrow('Texts parameter (array) is required for batch_extract_graph operation');
    });
  });

  describe('getToolSchemas', () => {
    it('should return tool schemas with descriptions', () => {
      const mockOntologyService = {
        getAllEntityTypes: jest.fn(() => ['Contract', 'Tender']),
        getAllRelationshipTypes: jest.fn(() => ['hasContractingAuthority'])
      };
      const mockNeo4jConnection = {};

      const result = getToolSchemas(mockOntologyService as any, mockNeo4jConnection as any);
      
      expect(result.query_knowledge_graph).toBeDefined();
      expect(result.nlp_processing).toBeDefined();
      expect(result.query_knowledge_graph.name).toBe('query_knowledge_graph');
      expect(result.nlp_processing.name).toBe('nlp_processing');
      expect(result.query_knowledge_graph.inputSchema).toBeDefined();
      expect(result.nlp_processing.inputSchema).toBeDefined();
    });
  });

  describe('getServerInfo', () => {
    it('should return server information', () => {
      const originalEnv = process.env.NEO4J_DATABASE;
      process.env.NEO4J_DATABASE = 'test-db';

      const result = getServerInfo();
      
      expect(result.server).toBe('mcp-unified-server');
      expect(result.version).toBe('2.0.0');
      expect(result.database).toBe('test-db');
      expect(result.activeOntologies).toEqual(['procurement', 'fibo']);
      expect(result.timestamp).toBeDefined();

      process.env.NEO4J_DATABASE = originalEnv;
    });
  });

  // Note: handleRequest tests removed as they require a server instance that's not available in this test context
}); 