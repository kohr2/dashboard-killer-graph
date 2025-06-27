import { ChatService } from '@platform/chat/application/services/chat.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { Conversation } from '@platform/chat/domain/conversation';
import { ANALYST_ROLE, GUEST_ROLE, PermissionAction, PermissionResource } from '@platform/security/domain/role';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { QueryTranslator, ConversationTurn } from '@platform/chat/application/services/query-translator.service';

jest.mock('@platform/security/application/services/access-control.service');
jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/database/neo4j-connection');
jest.mock('@platform/chat/application/services/query-translator.service');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockAccessControlService: jest.Mocked<AccessControlService>;
  let mockOntologyService: jest.Mocked<OntologyService>;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockQueryTranslator: jest.Mocked<QueryTranslator>;
  let mockSession: { run: jest.Mock; close: jest.Mock };

  const analystUser: User = { id: 'analyst-1', username: 'analyst', roles: [ANALYST_ROLE] };
  const guestUser: User = { id: 'guest-1', username: 'guest', roles: [GUEST_ROLE] };

  const sampleConversation: Conversation = {
    id: 'conv-1',
    subject: 'Deal:deal-123',
    participants: ['analyst-1'],
    messages: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockAccessControlService = new AccessControlService() as jest.Mocked<AccessControlService>;
    mockOntologyService = new OntologyService() as jest.Mocked<OntologyService>;
    mockNeo4jConnection = new Neo4jConnection() as jest.Mocked<Neo4jConnection>;
    mockQueryTranslator = new QueryTranslator({} as any) as jest.Mocked<QueryTranslator>;
    
    mockSession = { run: jest.fn(), close: jest.fn() };
    mockNeo4jConnection.getDriver = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue(mockSession)
    });
    
    // In a real app, we would inject a ConversationRepository
    chatService = new ChatService(mockAccessControlService, mockOntologyService, mockNeo4jConnection, mockQueryTranslator);

    // Seed data for ontology service
    mockOntologyService.getAllEntityTypes = jest.fn().mockReturnValue(['Contact', 'Deal', 'Organization']);
    mockAccessControlService.can = jest.fn();
  });

  describe('sendMessage', () => {
    it('should allow a user to send a message if they have read access to the conversation subject', async () => {
      mockAccessControlService.can.mockReturnValue(true);
      
      const messageText = 'Hello, this is a message';
      const message = await chatService.sendMessage(analystUser, sampleConversation.id, messageText);

      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Deal');
      expect(message.text).toBe(messageText);
      expect(message.userId).toBe(analystUser.id);
    });

    it('should throw an error if a user does not have read access to the conversation subject', async () => {
      mockAccessControlService.can.mockReturnValue(false);

      await expect(
        chatService.sendMessage(guestUser, sampleConversation.id, 'I should not be able to send this')
      ).rejects.toThrow('Access denied to conversation subject');
      
      expect(mockAccessControlService.can).toHaveBeenCalledWith(guestUser, 'read', 'Deal');
    });

    it('should throw an error for an invalid subject format', async () => {
        const invalidConversation: Conversation = { ...sampleConversation, subject: 'InvalidSubjectFormat' };
        // We'd need to mock finding this conversation. For now, we can test the helper function directly
        // or assume the service fetches it.
        
        // Let's test the check within sendMessage
        (chatService as any).getConversationById = jest.fn().mockResolvedValue(invalidConversation);

        await expect(
            chatService.sendMessage(analystUser, invalidConversation.id, 'test')
        ).rejects.toThrow('Invalid conversation subject format');
    });
  });

  describe('getConversations', () => {
    it('should return only the conversations the user has access to', async () => {
      // Add a second conversation the user does NOT have access to.
      const taskConversation: Conversation = { id: 'conv-2', subject: 'Task:task-456', participants: [], messages: [], createdAt: new Date() };
      (chatService as any).conversations.set(taskConversation.id, taskConversation);

      // The analyst can read 'Deal' but not 'Task' by default in our roles
      mockAccessControlService.can.mockImplementation(
        (user: User, action: PermissionAction, resource: PermissionResource) => {
          return resource === 'Deal';
        }
      );

      const conversations = await chatService.getConversations(analystUser);
      
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv-1');
      expect(conversations[0].subject).toBe('Deal:deal-123');
      
      // Ensure the check was performed for each conversation
      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Deal');
      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Task');

      // Cleanup
      (chatService as any).conversations.delete(taskConversation.id);
    });

    it('should return an empty array if the user has access to no conversations', async () => {
        mockAccessControlService.can.mockReturnValue(false);
        const conversations = await chatService.getConversations(guestUser);
        expect(conversations).toHaveLength(0);
    });
  });

  describe('handleQuery', () => {
    it('should execute a query and return results for an authorized user', async () => {
        mockAccessControlService.can.mockReturnValue(true);
        const mockQueryResult = { records: [{ get: (key: string) => ({ properties: { name: 'John Doe' } }) }] };
        mockSession.run.mockResolvedValue(mockQueryResult);
        mockQueryTranslator.translate.mockResolvedValue({ command: 'show', resourceTypes: ['Contact'] });

        const query = "show all Contact";
        const result = await chatService.handleQuery(analystUser, query);

        expect(mockQueryTranslator.translate).toHaveBeenCalledWith(query, expect.any(Array));
        expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'query', 'Contact');
        const executedCypher = mockSession.run.mock.calls[0][0];
        expect(executedCypher).toContain('MATCH (n:`Contact`)');
        expect(executedCypher).toContain('RETURN n LIMIT 20');
        expect(result).toContain('John Doe');
    });

    it('should deny access if user does not have query permission', async () => {
        mockQueryTranslator.translate.mockResolvedValue({ command: 'show', resourceTypes: ['Deal'] });
        mockAccessControlService.can.mockReturnValue(false);
        const query = "show all Deal";
        
        const result = await chatService.handleQuery(guestUser, query);
        
        expect(mockAccessControlService.can).toHaveBeenCalledWith(guestUser, 'query', 'Deal');
        expect(mockSession.run).not.toHaveBeenCalled();
        expect(result).toContain("I couldn't find any information for your query.");
    });

    it('should return an empty result for an unknown resource type', async () => {
        mockQueryTranslator.translate.mockResolvedValue({ command: 'show', resourceTypes: ['Unicorn'] });
        mockAccessControlService.can.mockReturnValue(true);
        const query = "show all Unicorn";

        const result = await chatService.handleQuery(analystUser, query);
        
        expect(mockOntologyService.getAllEntityTypes).toHaveBeenCalled();
        expect(mockAccessControlService.can).not.toHaveBeenCalled();
        expect(mockSession.run).not.toHaveBeenCalled();
        expect(result).toContain("I couldn't find any information for your query.");
    });

     it('should return a graceful message for a malformed query', async () => {
        mockQueryTranslator.translate.mockResolvedValue({ command: 'unknown', resourceTypes: [] });
        const query = "show everything";
        const result = await chatService.handleQuery(analystUser, query);
        expect(result).toContain("I'm sorry, I can only show resources");
    });

    describe('handleQuery with show_related', () => {
        it('should correctly handle a show_related command and call generateNaturalResponse with source entity', async () => {
            const rawQuery = 'what are the deals for Organization X';
            const structuredQuery = {
                command: 'show_related',
                resourceTypes: ['Deal'],
                relatedTo: ['Organization'],
                filters: { name: 'Organization X' },
            };
            const sourceEntity = { id: 'org-x', name: 'Organization X' };
            const relatedResources = [{ id: 'deal-1', name: 'Project Alpha' }];
            const finalResponse = 'Here is the deal for Organization X: Project Alpha.';

            mockQueryTranslator.translate.mockResolvedValue(structuredQuery as any);
            
            // Mock the internal findRelatedResources call
            const findRelatedResourcesSpy = jest.spyOn(chatService as any, 'findRelatedResources').mockResolvedValue({
                sourceEntity,
                relatedResources,
            });

            // Mock the final response generation
            const generateNaturalResponseSpy = jest.spyOn(chatService as any, 'generateNaturalResponse').mockResolvedValue(finalResponse);

            const result = await chatService.handleQuery(analystUser, rawQuery);

            expect(mockQueryTranslator.translate).toHaveBeenCalledWith(rawQuery, expect.any(Array));
            expect(findRelatedResourcesSpy).toHaveBeenCalledWith(
                analystUser,
                structuredQuery.resourceTypes,
                structuredQuery.relatedTo,
                structuredQuery.filters,
                undefined, // sourceEntityName
                undefined  // relationshipType
            );
            expect(generateNaturalResponseSpy).toHaveBeenCalledWith(rawQuery, relatedResources, sourceEntity);
            expect(result).toBe(finalResponse);

            findRelatedResourcesSpy.mockRestore();
            generateNaturalResponseSpy.mockRestore();
        });
    });
  });
}); 