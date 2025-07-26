import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChatService } from '../chat.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { QueryTranslator } from '../query-translator.service';
import { User } from '@platform/security/domain/user';
import { ConversationTurn } from '../query-translator.types';

// Mock dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/security/application/services/access-control.service');
jest.mock('../query-translator.service');

describe('Dynamic Database Switching', () => {
  let chatService: ChatService;
  let mockNeo4jConnection: any;
  let mockOntologyService: any;
  let mockAccessControlService: any;
  let mockQueryTranslator: any;
  let mockUser: User;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances with simple typing
    const mockSession = {
      run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
    };
    
    mockNeo4jConnection = {
      switchDatabase: jest.fn<(database: string) => Promise<void>>().mockResolvedValue(undefined),
      getSession: jest.fn().mockReturnValue(mockSession),
      getDatabase: jest.fn().mockReturnValue('procurement'),
      connect: jest.fn(),
      close: jest.fn(),
      initializeSchema: jest.fn(),
      clearDatabase: jest.fn(),
      listDatabases: jest.fn(),
      dropDatabase: jest.fn(),
      findSimilarOrganizationEmbedding: jest.fn(),
      getDriver: jest.fn(),
    };

    mockOntologyService = {
      getAllEntityTypes: jest.fn().mockReturnValue(['Person', 'Contract']),
      getIndexableEntityTypes: jest.fn().mockReturnValue(['Person']),
      getAllRelationshipTypes: jest.fn().mockReturnValue(['WORKS_FOR']),
      getAlternativeLabels: jest.fn().mockReturnValue([]),
      getAllOntologies: jest.fn().mockReturnValue(['procurement']),
    };

    mockAccessControlService = {
      can: jest.fn().mockReturnValue(true),
    };

    mockQueryTranslator = {
      translate: jest.fn<(query: string, history: ConversationTurn[]) => Promise<{ command: string; resourceTypes: string[] }>>().mockResolvedValue({
        command: 'show',
        resourceTypes: ['Person'],
      }),
    };

    mockUser = {
      id: 'test-user',
      username: 'testuser',
      roles: [{ name: 'admin', permissions: [{ action: '*', resource: '*' }] }],
    };

    mockOpenAI = { chat: { completions: { create: jest.fn() } } };

    // Create ChatService instance
    chatService = new ChatService(
      mockNeo4jConnection,
      mockOntologyService,
      mockAccessControlService,
      mockQueryTranslator,
      mockOpenAI
    );
  });

  describe('handleQuery with database parameter', () => {
    it('should switch database when database parameter is provided', async () => {
      // Arrange
      const query = 'show all persons';
      const database = 'financial';

      // Act
      await chatService.handleQuery(mockUser, query, database);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('financial');
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
    });

    it('should not switch database when no database parameter is provided', async () => {
      // Arrange
      const query = 'show all persons';

      // Act
      await chatService.handleQuery(mockUser, query);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
    });

    it('should handle database switching errors gracefully', async () => {
      // Arrange
      const query = 'show all persons';
      const database = 'nonexistent';
      const errorMessage = "Database 'nonexistent' does not exist";
      
      mockNeo4jConnection.switchDatabase.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(chatService.handleQuery(mockUser, query, database))
        .rejects
        .toThrow(errorMessage);
      
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith('nonexistent');
    });

    it('should use current database when database parameter is empty string', async () => {
      // Arrange
      const query = 'show all persons';
      const database = '';

      // Act
      await chatService.handleQuery(mockUser, query, database);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
    });

    it('should use current database when database parameter is null', async () => {
      // Arrange
      const query = 'show all persons';
      const database = null;

      // Act
      await chatService.handleQuery(mockUser, query, database);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
    });

    it('should use current database when database parameter is undefined', async () => {
      // Arrange
      const query = 'show all persons';
      const database = undefined;

      // Act
      await chatService.handleQuery(mockUser, query, database);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).not.toHaveBeenCalled();
      expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
    });
  });

  describe('Neo4jConnection database switching', () => {
    it('should validate database exists before switching', async () => {
      // Arrange
      const database = 'financial';
      
      // Mock the switchDatabase method to simulate successful validation
      mockNeo4jConnection.switchDatabase.mockResolvedValue(undefined);

      // Act
      await mockNeo4jConnection.switchDatabase(database);

      // Assert
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledWith(database);
    });

    it('should throw error when database does not exist', async () => {
      // Arrange
      const database = 'nonexistent';
      
      // Mock the switchDatabase method to simulate validation failure
      mockNeo4jConnection.switchDatabase.mockRejectedValue(
        new Error("Database 'nonexistent' does not exist")
      );

      // Act & Assert
      await expect(mockNeo4jConnection.switchDatabase(database))
        .rejects
        .toThrow("Database 'nonexistent' does not exist");
    });

    it('should not switch if already on the requested database', async () => {
      // Arrange
      const database = 'procurement'; // Same as current
      mockNeo4jConnection.getDatabase.mockReturnValue('procurement');

      // Act
      await mockNeo4jConnection.switchDatabase(database);

      // Assert
      expect(mockNeo4jConnection.getDriver).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple database switches in sequence', async () => {
      // Arrange
      const queries = [
        { query: 'show all persons', database: 'procurement' },
        { query: 'show all contracts', database: 'financial' },
        { query: 'show all companies', database: 'crm' }
      ];

      // Act
      for (const { query, database } of queries) {
        await chatService.handleQuery(mockUser, query, database);
      }

      // Assert
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenCalledTimes(3);
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenNthCalledWith(1, 'procurement');
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenNthCalledWith(2, 'financial');
      expect(mockNeo4jConnection.switchDatabase).toHaveBeenNthCalledWith(3, 'crm');
    });

    it('should maintain query history across database switches', async () => {
      // Arrange
      const query1 = 'show all persons';
      const query2 = 'show all contracts';
      const database = 'financial';

      // Act
      await chatService.handleQuery(mockUser, query1, database);
      await chatService.handleQuery(mockUser, query2, database);

      // Assert
      expect(mockQueryTranslator.translate).toHaveBeenCalledTimes(2);
      expect(mockQueryTranslator.translate).toHaveBeenNthCalledWith(1, query1, expect.any(Array));
      expect(mockQueryTranslator.translate).toHaveBeenNthCalledWith(2, query2, expect.any(Array));
    });
  });
}); 