import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { OntologyService } from '@platform/ontology/ontology.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { registerAllOntologies } from '@src/register-ontologies';
import OpenAI from 'openai';

jest.mock('openai');

const mockOpenAICreate = jest.fn();
(OpenAI as unknown as jest.Mock).mockImplementation(() => ({
  chat: { completions: { create: mockOpenAICreate } },
}));

const testUser: User = {
  id: 'test-user',
  username: 'test-user',
  roles: [{ name: 'admin', permissions: [{ resource: '*', action: '*' }] }],
};

describe('Chat System Integration Test', () => {
  let connection: Neo4jConnection;
  let chatService: ChatService;
  let ontologyService: OntologyService;

  beforeAll(async () => {
    // Set up environment
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Register OntologyService singleton first
    container.registerSingleton(OntologyService);
    
    // Load ontologies into the singleton
    registerAllOntologies();
    
    // Get the singleton instance
    ontologyService = container.resolve(OntologyService);
    
    // Set up other services
    const accessControl = new AccessControlService();
    connection = new Neo4jConnection();

    container.register(Neo4jConnection, { useValue: connection });
    container.register(AccessControlService, { useValue: accessControl });

    // Resolve ChatService (it will get the singleton OntologyService)
    chatService = container.resolve(ChatService);
    
    await connection.connect();
  });

  afterAll(async () => {
    await connection.close();
    delete process.env.OPENAI_API_KEY;
    container.clearInstances();
  });

  beforeEach(async () => {
    mockOpenAICreate.mockClear();
    
    // Set up test data
    const session = connection.getSession();
    try {
      // Create test entities
      await session.run(`
        MERGE (d1:Deal {name: 'Apollo acquisition of TechCorp', amount: 500000000, stage: 'Closed'})
        MERGE (d2:Deal {name: 'Vista Equity Partners deal', amount: 250000000, stage: 'Due Diligence'})
        MERGE (p1:Person {name: 'Rick', role: 'Partner', organization: 'Thoma Bravo'})
        MERGE (p2:Person {name: 'John Smith', extension: '1234'})
        MERGE (o1:Organization {name: 'Thoma Bravo', type: 'Private Equity'})
        MERGE (o2:Organization {name: 'TechCorp', type: 'Technology'})
      `);
    } finally {
      await session.close();
    }
  });

  describe('Ontology Loading', () => {
    it('should have loaded all ontologies correctly', () => {
      const entityTypes = ontologyService.getAllEntityTypes();
      const relationshipTypes = ontologyService.getAllRelationshipTypes();
      
      expect(entityTypes.length).toBeGreaterThan(30); // Should have 34 entities
      expect(relationshipTypes.length).toBeGreaterThan(20); // Should have 24 relationships
      
      // Check key entity types are present
      expect(entityTypes).toContain('Person');
      expect(entityTypes).toContain('Deal');
      expect(entityTypes).toContain('Organization');
      expect(entityTypes).toContain('Contact');
    });

    it('should have the same ontology service instance across services', () => {
      const queryTranslator = container.resolve(QueryTranslator);
      const queryTranslatorOntologyService = (queryTranslator as any).ontologyService;
      
      expect(ontologyService).toBe(queryTranslatorOntologyService);
    });
  });

  describe('Query Translation', () => {
    it('should translate "show all deals" correctly', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Deal'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const naturalLanguageResponse = "I found 2 deals: 'Apollo acquisition of TechCorp' for $500,000,000 (Closed) and 'Vista Equity Partners deal' for $250,000,000 (Due Diligence).";
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: naturalLanguageResponse } }],
      });

      const response = await chatService.handleQuery(testUser, 'show all deals');

      expect(response).toEqual(naturalLanguageResponse);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
      
      // Verify the first call was for query translation
      const firstCall = mockOpenAICreate.mock.calls[0][0];
      expect(firstCall.messages[1].content).toContain('show all deals');
      expect(firstCall.messages[0].content).toContain('Deal'); // Schema should contain Deal entity
    });

    it('should translate "show me people" correctly', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Person'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const naturalLanguageResponse = "I found 2 people: Rick (Partner at Thoma Bravo) and John Smith (Extension: 1234).";
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: naturalLanguageResponse } }],
      });

      const response = await chatService.handleQuery(testUser, 'show me people');

      expect(response).toEqual(naturalLanguageResponse);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    });

    it('should handle synonym recognition (people/persons)', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Person'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const naturalLanguageResponse = "I found 2 people: Rick (Partner at Thoma Bravo) and John Smith (Extension: 1234).";
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: naturalLanguageResponse } }],
      });

      const response = await chatService.handleQuery(testUser, 'show all persons');

      expect(response).toEqual(naturalLanguageResponse);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database Integration', () => {
    it('should retrieve actual data from Neo4j', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Organization'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const naturalLanguageResponse = "I found 2 organizations: Thoma Bravo (Private Equity) and TechCorp (Technology).";
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: naturalLanguageResponse } }],
      });

      const response = await chatService.handleQuery(testUser, 'show me organizations');

      expect(response).toEqual(naturalLanguageResponse);
      
      // Verify the second call (RAG) received actual data from Neo4j
      const secondCall = mockOpenAICreate.mock.calls[1][0];
      expect(secondCall.messages[1].content).toContain('Thoma Bravo');
      expect(secondCall.messages[1].content).toContain('TechCorp');
    });

    it('should handle empty results gracefully', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Contact'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const response = await chatService.handleQuery(testUser, 'list all contacts');

      expect(response).toEqual("I couldn't find any information for your query.");
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1); // Only translation call, no RAG call
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await chatService.handleQuery(testUser, 'show all deals');

      expect(response).toEqual("I'm sorry, I can only show resources or find related ones. Please ask me to 'show all [resource]' or something similar.");
    });

    it('should handle invalid JSON from OpenAI', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'invalid json' } }],
      });

      const response = await chatService.handleQuery(testUser, 'show all deals');

      expect(response).toEqual("I'm sorry, I can only show resources or find related ones. Please ask me to 'show all [resource]' or something similar.");
    });
  });

  describe('Access Control', () => {
    it('should allow admin users to query all resources', async () => {
      const structuredQueryResponse = { command: 'show', resourceTypes: ['Deal'] };
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
      });

      const naturalLanguageResponse = "I found deals as an admin user.";
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: naturalLanguageResponse } }],
      });

      const response = await chatService.handleQuery(testUser, 'show all deals');

      expect(response).toEqual(naturalLanguageResponse);
    });
  });
}); 