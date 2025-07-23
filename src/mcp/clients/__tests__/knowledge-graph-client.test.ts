import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { KnowledgeGraphClient, KnowledgeGraphClientError } from '../knowledge-graph-client';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KnowledgeGraphClient', () => {
  let client: KnowledgeGraphClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn(),
    };
    
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    
    client = new KnowledgeGraphClient({
      baseUrl: 'http://test-server:3002',
      timeout: 5000,
      retries: 2,
      apiKey: 'test-api-key'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default configuration', () => {
      const defaultClient = new KnowledgeGraphClient();
      
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3002',
        timeout: 300000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KnowledgeGraph-Client/1.0'
        }
      });
    });

    it('should create client with custom configuration', () => {
      const customClient = new KnowledgeGraphClient({
        baseUrl: 'http://custom-server:8080',
        timeout: 10000,
        retries: 5,
        apiKey: 'custom-key'
      });

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://custom-server:8080',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KnowledgeGraph-Client/1.0',
          'Authorization': 'Bearer custom-key'
        }
      });
    });

    it('should handle baseUrl with trailing slash', () => {
      const clientWithSlash = new KnowledgeGraphClient({
        baseUrl: 'http://test-server:3002/'
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://test-server:3002'
        })
      );
    });
  });

  describe('makeRequest', () => {
    it('should make successful request', async () => {
      const mockResponse = {
        data: { status: 'ok', message: 'success' },
        status: 200
      };
      
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await (client as any).makeRequest('GET', '/health');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/health',
        data: undefined
      });
      expect(result).toEqual({ status: 'ok', message: 'success' });
    });

    it('should handle HTTP errors', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { error: 'Not found' }
        }
      };
      
      mockAxiosInstance.request.mockRejectedValue(errorResponse);

      await expect((client as any).makeRequest('GET', '/not-found'))
        .rejects.toThrow('HTTP 404: Not found');
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network error');
      const successResponse = {
        data: { status: 'ok' },
        status: 200
      };
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await (client as any).makeRequest('GET', '/health');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ status: 'ok' });
    });

    it('should throw error after max retries', async () => {
      const networkError = new Error('Network error');
      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect((client as any).makeRequest('GET', '/health'))
        .rejects.toThrow('Request failed after 2 retries: Network error');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const healthResponse = {
        status: 'healthy',
        server: 'test-server',
        version: '1.0.0',
        database: 'neo4j',
        activeOntologies: ['procurement', 'financial']
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: healthResponse });

      const result = await client.healthCheck();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/health',
        data: undefined
      });
      expect(result).toEqual(healthResponse);
    });
  });

  describe('getTools', () => {
    it('should return available tools', async () => {
      const toolsResponse = {
        tools: [
          {
            name: 'query_knowledge_graph',
            description: 'Query the knowledge graph',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        ]
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: toolsResponse });

      const result = await client.getTools();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/tools',
        data: undefined
      });
      expect(result).toEqual(toolsResponse);
    });
  });

  describe('queryKnowledgeGraph', () => {
    it('should query knowledge graph', async () => {
      const callResponse = {
        tool: 'query_knowledge_graph',
        result: {
          content: 'Query results',
          query: 'MATCH (n) RETURN n'
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.queryKnowledgeGraph('Find all entities');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'query_knowledge_graph',
          arguments: { query: 'Find all entities' }
        }
      });
      expect(result).toEqual({
        content: 'Query results',
        query: 'MATCH (n) RETURN n',
        timestamp: '2023-01-01T00:00:00Z'
      });
    });
  });

  describe('query', () => {
    it('should make simple query', async () => {
      const queryResponse = {
        content: 'Simple query results',
        query: 'MATCH (n) RETURN n LIMIT 10',
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: queryResponse });

      const result = await client.query('Find entities');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/query?q=Find%20entities',
        data: undefined
      });
      expect(result).toEqual(queryResponse);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      const callResponse = {
        tool: 'nlp_processing',
        result: {
          entities: [
            { id: '1', name: 'John Doe', type: 'PERSON' },
            { id: '2', name: 'Acme Corp', type: 'ORGANIZATION' }
          ]
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.extractEntities('John Doe works at Acme Corp', 'procurement');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'nlp_processing',
          arguments: {
            operation: 'extract_entities',
            text: 'John Doe works at Acme Corp',
            ontology_name: 'procurement'
          }
        }
      });
      expect(result).toEqual(callResponse.result);
    });
  });

  describe('refineEntities', () => {
    it('should refine entities using LLM', async () => {
      const callResponse = {
        tool: 'nlp_processing',
        result: {
          refined_entities: [
            { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.95 }
          ]
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.refineEntities('John Doe works at Acme Corp', 'financial');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'nlp_processing',
          arguments: {
            operation: 'refine_entities',
            text: 'John Doe works at Acme Corp',
            ontology_name: 'financial'
          }
        }
      });
      expect(result).toEqual(callResponse.result);
    });
  });

  describe('extractGraph', () => {
    it('should extract knowledge graph from text', async () => {
      const callResponse = {
        tool: 'nlp_processing',
        result: {
          entities: [{ id: '1', name: 'John Doe', type: 'PERSON' }],
          relationships: [{ from: '1', to: '2', type: 'WORKS_FOR' }]
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.extractGraph('John Doe works at Acme Corp', 'default');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'nlp_processing',
          arguments: {
            operation: 'extract_graph',
            text: 'John Doe works at Acme Corp',
            ontology_name: 'default'
          }
        }
      });
      expect(result).toEqual(callResponse.result);
    });
  });

  describe('batchExtractGraph', () => {
    it('should batch extract knowledge graphs', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const callResponse = {
        tool: 'nlp_processing',
        result: {
          graphs: [
            { entities: [], relationships: [] },
            { entities: [], relationships: [] },
            { entities: [], relationships: [] }
          ]
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.batchExtractGraph(texts, 'procurement');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'nlp_processing',
          arguments: {
            operation: 'batch_extract_graph',
            texts,
            ontology_name: 'procurement'
          }
        }
      });
      expect(result).toEqual(callResponse.result);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for texts', async () => {
      const texts = ['Text 1', 'Text 2'];
      const callResponse = {
        tool: 'nlp_processing',
        result: {
          embeddings: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6]
          ]
        },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.generateEmbeddings(texts);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: {
          tool: 'nlp_processing',
          arguments: {
            operation: 'generate_embeddings',
            texts
          }
        }
      });
      expect(result).toEqual(callResponse.result);
    });
  });

  describe('callTool', () => {
    it('should call custom tool', async () => {
      const toolName = 'custom_tool';
      const args = { param1: 'value1', param2: 'value2' };
      const callResponse = {
        tool: toolName,
        result: { success: true },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: callResponse });

      const result = await client.callTool(toolName, args);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/call',
        data: { tool: toolName, arguments: args }
      });
      expect(result).toEqual(callResponse);
    });
  });

  describe('processNLP', () => {
    it('should process NLP operations', async () => {
      const operation = 'extract_entities';
      const options = {
        text: 'Sample text',
        ontology_name: 'procurement'
      };
      const nlpResponse = {
        operation,
        result: { entities: [] },
        ontology_used: 'procurement',
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: nlpResponse });

      const result = await client.processNLP(operation, options);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/nlp',
        data: { operation, ...options }
      });
      expect(result).toEqual(nlpResponse);
    });
  });

  describe('getServerInfo', () => {
    it('should get server information', async () => {
      const serverInfo = {
        name: 'Knowledge Graph Server',
        version: '1.0.0',
        status: 'running'
      };
      
      mockAxiosInstance.request.mockResolvedValue({ data: serverInfo });

      const result = await client.getServerInfo();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/',
        data: undefined
      });
      expect(result).toEqual(serverInfo);
    });
  });

  describe('KnowledgeGraphClientError', () => {
    it('should create error with message', () => {
      const error = new KnowledgeGraphClientError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('KnowledgeGraphClientError');
    });

    it('should create error with status code and response', () => {
      const response = { data: { error: 'Not found' } };
      const error = new KnowledgeGraphClientError('HTTP Error', 404, response);
      
      expect(error.message).toBe('HTTP Error');
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual(response);
    });
  });
}); 