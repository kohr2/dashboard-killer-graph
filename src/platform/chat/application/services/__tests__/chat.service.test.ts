import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ChatService, ChatQuery, ChatResponse } from '../chat.service';
import { User } from '@platform/security/domain/user';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { QueryTranslator } from '../query-translator.service';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/security/application/services/access-control.service');
jest.mock('../query-translator.service');
jest.mock('openai');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockOntologyService: jest.Mocked<OntologyService>;
  let mockAccessControlService: jest.Mocked<AccessControlService>;
  let mockQueryTranslator: jest.Mocked<QueryTranslator>;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockUser: User;

  beforeEach(() => {
    // Create mock instances
    mockNeo4jConnection = {
      getSession: jest.fn(),
      getDatabase: jest.fn(),
      switchDatabase: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      initializeSchema: jest.fn(),
      clearDatabase: jest.fn(),
      listDatabases: jest.fn(),
      dropDatabase: jest.fn(),
      findSimilarOrganizationEmbedding: jest.fn(),
      getDriver: jest.fn(),
    } as any;

    mockOntologyService = {
      getOntology: jest.fn(),
      getAllOntologies: jest.fn(),
      validateEntity: jest.fn(),
      validateRelationship: jest.fn(),
    } as any;

    mockAccessControlService = {
      checkPermission: jest.fn(),
      getUserPermissions: jest.fn(),
      hasPermission: jest.fn(),
    } as any;

    mockQueryTranslator = {
      translateQuery: jest.fn(),
      getQueryHistory: jest.fn(),
      clearHistory: jest.fn(),
    } as any;

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['analyst'],
    };

    // Mock environment variable
    const originalEnv = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-api-key';

    chatService = new ChatService(
      mockNeo4jConnection,
      mockOntologyService,
      mockAccessControlService,
      mockQueryTranslator,
      mockOpenAI
    );

    process.env.OPENAI_API_KEY = originalEnv;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with OpenAI API key from environment', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'env-api-key';

      const service = new ChatService(
        mockNeo4jConnection,
        mockOntologyService,
        mockAccessControlService,
        mockQueryTranslator
      );

      expect(service).toBeInstanceOf(ChatService);
      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should throw error when OpenAI API key is not set', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        new ChatService(
          mockNeo4jConnection,
          mockOntologyService,
          mockAccessControlService,
          mockQueryTranslator
        );
      }).toThrow('OPENAI_API_KEY environment variable is not set.');

      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should seed with sample conversation', () => {
      expect(chatService).toBeInstanceOf(ChatService);
    });
  });

  describe('getConversationById', () => {
    it('should return conversation when found', async () => {
      const conversation = await (chatService as any).getConversationById('conv-1');
      
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe('conv-1');
      expect(conversation?.subject).toBe('Deal:deal-123');
    });

    it('should return undefined when conversation not found', async () => {
      const conversation = await (chatService as any).getConversationById('nonexistent');
      
      expect(conversation).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('should send message to existing conversation', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      mockAccessControlService.checkPermission.mockResolvedValue(true);

      const message = await chatService.sendMessage(mockUser, 'conv-1', 'Hello world');

      expect(message).toBeDefined();
      expect(message.text).toBe('Hello world');
      expect(message.sender).toBe('testuser');
    });

    it('should throw error when conversation not found', async () => {
      await expect(chatService.sendMessage(mockUser, 'nonexistent', 'Hello'))
        .rejects.toThrow('Conversation not found');
    });

    it('should throw error for invalid conversation subject format', async () => {
      // Create a conversation with invalid subject format
      const invalidConversation = {
        id: 'invalid-conv',
        subject: 'invalid-subject-format',
        participants: ['analyst-1'],
        messages: [],
        createdAt: new Date(),
      };
      (chatService as any).conversations.set('invalid-conv', invalidConversation);

      await expect(chatService.sendMessage(mockUser, 'invalid-conv', 'Hello'))
        .rejects.toThrow('Invalid conversation subject format');
    });
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const conversations = await chatService.getConversations(mockUser);

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv-1');
    });
  });

  describe('handleQuery', () => {
    it('should handle query with database switching', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);
      mockNeo4jConnection.getDatabase.mockReturnValue('procurement');

      const result = await chatService.handleQuery(mockUser, 'Find all deals', 'financial');

      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('financial');
      expect(result).toBeDefined();
    });

    it('should handle query without database switching', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const result = await chatService.handleQuery(mockUser, 'Find all deals');

      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('processQuery', () => {
    it('should process chat query successfully', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const chatQuery: ChatQuery = {
        query: 'Find all deals',
        limit: 10,
        offset: 0,
        filters: { status: 'active' },
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      };

      const result = await chatService.processQuery(mockUser, chatQuery);

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
    });

    it('should handle query with pagination', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const chatQuery: ChatQuery = {
        query: 'Find deals',
        limit: 5,
        offset: 10
      };

      const result = await chatService.processQuery(mockUser, chatQuery);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('parseQuery', () => {
    it('should parse query intent and entities', async () => {
      const result = await (chatService as any).parseQuery('Find all deals from Acme Corp');

      expect(result.intent).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.resourceTypes).toBeDefined();
      expect(result.filters).toBeDefined();
    });

    it('should handle empty query', async () => {
      const result = await (chatService as any).parseQuery('');

      expect(result.intent).toBeDefined();
      expect(result.entities).toEqual([]);
    });
  });

  describe('extractIntent', () => {
    it('should extract find intent', () => {
      const intent = (chatService as any).extractIntent('Find all deals');
      expect(intent).toBe('find');
    });

    it('should extract create intent', () => {
      const intent = (chatService as any).extractIntent('Create new deal');
      expect(intent).toBe('create');
    });

    it('should extract update intent', () => {
      const intent = (chatService as any).extractIntent('Update deal status');
      expect(intent).toBe('update');
    });

    it('should extract delete intent', () => {
      const intent = (chatService as any).extractIntent('Delete deal');
      expect(intent).toBe('delete');
    });

    it('should return unknown for unrecognized intent', () => {
      const intent = (chatService as any).extractIntent('Random text');
      expect(intent).toBe('unknown');
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from query', () => {
      const entities = (chatService as any).extractEntities('Find deals from Acme Corp and John Doe');
      
      expect(entities).toContain('Acme Corp');
      expect(entities).toContain('John Doe');
    });

    it('should handle query with no entities', () => {
      const entities = (chatService as any).extractEntities('Find all deals');
      expect(entities).toEqual([]);
    });
  });

  describe('mapToResourceTypes', () => {
    it('should map deal to Deal resource type', () => {
      const resourceTypes = (chatService as any).mapToResourceTypes('Find deals');
      expect(resourceTypes).toContain('Deal');
    });

    it('should map contact to Contact resource type', () => {
      const resourceTypes = (chatService as any).mapToResourceTypes('Find contacts');
      expect(resourceTypes).toContain('Contact');
    });

    it('should map organization to Organization resource type', () => {
      const resourceTypes = (chatService as any).mapToResourceTypes('Find organizations');
      expect(resourceTypes).toContain('Organization');
    });

    it('should return empty array for unknown resource', () => {
      const resourceTypes = (chatService as any).mapToResourceTypes('Find unknown');
      expect(resourceTypes).toEqual([]);
    });
  });

  describe('extractFilters', () => {
    it('should extract filters from query', () => {
      const filters = (chatService as any).extractFilters('Find deals with status active and value > 1000');
      
      expect(filters.status).toBe('active');
      expect(filters.value).toBe('> 1000');
    });

    it('should handle query with no filters', () => {
      const filters = (chatService as any).extractFilters('Find all deals');
      expect(filters).toEqual({});
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with filters', () => {
      const filters = { status: 'active', value: '> 1000' };
      const result = (chatService as any).buildWhereClause(filters);

      expect(result.whereClause).toContain('WHERE');
      expect(result.params).toEqual(filters);
    });

    it('should return empty where clause for no filters', () => {
      const result = (chatService as any).buildWhereClause();
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual({});
    });
  });

  describe('buildPaginationClause', () => {
    it('should build pagination clause', () => {
      const pagination = {
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const
      };
      const result = (chatService as any).buildPaginationClause(pagination);

      expect(result.orderClause).toContain('ORDER BY');
      expect(result.limitClause).toContain('LIMIT');
    });

    it('should handle pagination without sort', () => {
      const pagination = {
        limit: 10,
        offset: 0,
        sortBy: '',
        sortOrder: 'ASC' as const
      };
      const result = (chatService as any).buildPaginationClause(pagination);

      expect(result.orderClause).toBe('');
      expect(result.limitClause).toContain('LIMIT');
    });
  });

  describe('generateResponse', () => {
    it('should generate natural language response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Found 5 deals' } }]
      } as any);

      const response = await (chatService as any).generateResponse(
        'find',
        ['Acme Corp'],
        [{ id: '1', name: 'Deal 1' }]
      );

      expect(response).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const response = await (chatService as any).generateResponse(
        'find',
        ['Acme Corp'],
        [{ id: '1', name: 'Deal 1' }]
      );

      expect(response).toContain('Found 1 results');
    });
  });

  describe('cleanRecord', () => {
    it('should clean Neo4j record', () => {
      const mockRecord = {
        get: jest.fn().mockReturnValue({ properties: { name: 'Test' } }),
        keys: () => ['node']
      };

      const result = (chatService as any).cleanRecord(mockRecord);

      expect(result).toEqual({ name: 'Test' });
    });

    it('should handle record with no properties', () => {
      const mockRecord = {
        get: jest.fn().mockReturnValue({}),
        keys: () => ['node']
      };

      const result = (chatService as any).cleanRecord(mockRecord);

      expect(result).toEqual({});
    });
  });

  describe('formatResults', () => {
    it('should format results for display', () => {
      const resourceTypes = ['Deal'];
      const records = [
        { id: '1', name: 'Deal 1', status: 'active' },
        { id: '2', name: 'Deal 2', status: 'pending' }
      ];

      const result = (chatService as any).formatResults(resourceTypes, records);

      expect(result).toContain('Deal 1');
      expect(result).toContain('Deal 2');
    });

    it('should handle empty results', () => {
      const result = (chatService as any).formatResults(['Deal'], []);
      expect(result).toContain('No results found');
    });
  });

  describe('ChatQuery interface', () => {
    it('should validate ChatQuery structure', () => {
      const query: ChatQuery = {
        query: 'Find deals',
        limit: 10,
        offset: 0,
        filters: { status: 'active' },
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      };

      expect(query.query).toBe('Find deals');
      expect(query.limit).toBe(10);
      expect(query.filters?.status).toBe('active');
    });
  });

  describe('ChatResponse interface', () => {
    it('should validate ChatResponse structure', () => {
      const response: ChatResponse = {
        answer: 'Found 5 deals',
        data: [{ id: '1', name: 'Deal 1' }],
        metadata: {
          total: 5,
          page: 1,
          pageSize: 10,
          hasMore: false,
          executionTime: 100
        }
      };

      expect(response.answer).toBe('Found 5 deals');
      expect(response.data).toHaveLength(1);
      expect(response.metadata?.total).toBe(5);
    });
  });
}); 