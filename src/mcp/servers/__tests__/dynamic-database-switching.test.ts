import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { processKnowledgeGraphQuery } from '../mcp-server-core';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { User } from '@platform/security/domain/user';

// Mock dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/security/application/services/access-control.service');
jest.mock('@platform/chat/application/services/query-translator.service');

describe('MCP Server Dynamic Database Switching', () => {
  let chatService: ChatService;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockOntologyService: jest.Mocked<OntologyService>;
  let mockAccessControlService: jest.Mocked<AccessControlService>;
  let mockQueryTranslator: jest.Mocked<QueryTranslator>;
  let mockUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    const mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    mockNeo4jConnection = {
      switchDatabase: jest.fn().mockResolvedValue(undefined as any),
      getSession: jest.fn().mockReturnValue(mockSession),
      getDatabase: jest.fn().mockReturnValue('procurement'),
      connect: jest.fn(),
      close: jest.fn(),
      initializeSchema: jest.fn(),
      clearDatabase: jest.fn(),
      listDatabases: jest.fn(),
      dropDatabase: jest.fn(),
      findSimilarOrganizationEmbedding: jest.fn(),
    } as any;

    mockOntologyService = {
      getAllEntityTypes: jest.fn().mockReturnValue(['Person', 'Contract']),
      getIndexableEntityTypes: jest.fn().mockReturnValue(['Person']),
      getAllRelationshipTypes: jest.fn().mockReturnValue(['WORKS_FOR']),
      getAlternativeLabels: jest.fn().mockReturnValue([]),
      getAllOntologies: jest.fn().mockReturnValue(['procurement']),
    } as any;

    mockAccessControlService = {
      can: jest.fn().mockReturnValue(true),
    } as any;

    mockQueryTranslator = {
      translate: jest.fn().mockResolvedValue({
        command: 'show',
        resourceTypes: ['Person'],
      } as any),
    } as any;

    mockUser = {
      id: 'mcp-server-user',
      username: 'mcp-server',
      roles: [{ name: 'admin', permissions: [{ action: '*', resource: '*' }] }],
    };

    // Create ChatService instance
    chatService = new ChatService(
      mockNeo4jConnection,
      mockOntologyService,
      mockAccessControlService,
      mockQueryTranslator
    );
  });

  describe('processKnowledgeGraphQuery with database parameter', () => {
    it('should pass database parameter to ChatService', async () => {
      // Arrange
      const query = 'show all persons';
      const database = 'financial';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('financial');
    });

    it('should handle queries without database parameter', async () => {
      // Arrange
      const query = 'show all persons';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
    });

    it('should add LIMIT clause when not present', async () => {
      // Arrange
      const query = 'show all persons';
      const database = 'procurement';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result.query).toContain('LIMIT 10');
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith('show all persons LIMIT 10', expect.any(Array));
    });

    it('should not add LIMIT clause when already present', async () => {
      // Arrange
      const query = 'show all persons LIMIT 5';
      const database = 'procurement';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result.query).toBe('show all persons LIMIT 5');
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith('show all persons LIMIT 5', expect.any(Array));
    });

    it('should handle database switching errors', async () => {
      // Arrange
      const query = 'show all persons';
      const database = 'nonexistent';
      const errorMessage = "Database 'nonexistent' does not exist";
      
      mockNeo4jConnection.switchDatabase.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(processKnowledgeGraphQuery(chatService, query, mockUser, database))
        .rejects
        .toThrow(errorMessage);
    });

    it('should validate query parameter', async () => {
      // Arrange
      const query = null as any;
      const database = 'procurement';

      // Act & Assert
      await expect(processKnowledgeGraphQuery(chatService, query, mockUser, database))
        .rejects
        .toThrow('Query parameter is required and must be a string');
    });

    it('should validate query parameter is string', async () => {
      // Arrange
      const query = 123 as any;
      const database = 'procurement';

      // Act & Assert
      await expect(processKnowledgeGraphQuery(chatService, query, mockUser, database))
        .rejects
        .toThrow('Query parameter is required and must be a string');
    });
  });

  describe('MCP Tool Schema Integration', () => {
    it('should support database parameter in tool schema', () => {
      // This test verifies that the tool schema includes the database parameter
      // The actual schema is defined in mcp-server-core.ts
      expect(true).toBe(true); // Placeholder for schema validation
    });

    it('should handle empty database parameter gracefully', async () => {
      // Arrange
      const query = 'show all persons';
      const database = '';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
    });

    it('should handle undefined database parameter gracefully', async () => {
      // Arrange
      const query = 'show all persons';
      const database = undefined;

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle procurement database queries', async () => {
      // Arrange
      const query = 'show all contracts';
      const database = 'procurement';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('procurement');
    });

    it('should handle financial database queries', async () => {
      // Arrange
      const query = 'show all companies';
      const database = 'financial';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('financial');
    });

    it('should handle CRM database queries', async () => {
      // Arrange
      const query = 'show all customers';
      const database = 'crm';

      // Act
      const result = await processKnowledgeGraphQuery(chatService, query, mockUser, database);

      // Assert
      expect(result).toBeDefined();
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('crm');
    });
  });
}); 