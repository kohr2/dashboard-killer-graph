import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { OntologyService } from '@platform/ontology/ontology.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import OpenAI from 'openai';

// Mock the OpenAI dependency
jest.mock('openai');

const mockOpenAICreate = jest.fn();
(OpenAI as unknown as jest.Mock).mockImplementation(() => {
  return {
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  };
});

// A simple mock user for testing purposes
const testUser: User = {
    id: 'test-user',
    username: 'test-user',
    roles: [{ name: 'admin', permissions: [] }],
};

describe('ChatService Deal Queries Integration Test', () => {
  let connection: Neo4jConnection;
  let chatService: ChatService;

  beforeAll(async () => {
    // Set a dummy API key to avoid constructor error
    process.env.OPENAI_API_KEY = 'test-key';

    // Setup dependency injection container
    const ontologyService = new OntologyService();
    const queryTranslator = new QueryTranslator(ontologyService);
    const accessControl = new AccessControlService();
    connection = new Neo4jConnection();

    container.register(Neo4jConnection, { useValue: connection });
    container.register(OntologyService, { useValue: ontologyService });
    container.register(AccessControlService, { useValue: accessControl });
    container.register(QueryTranslator, { useValue: queryTranslator });
    
    chatService = container.resolve(ChatService);
    
    await connection.connect();
  });

  afterAll(async () => {
    await connection.close();
    delete process.env.OPENAI_API_KEY;
  });

  beforeEach(async () => {
    mockOpenAICreate.mockClear();
    const session = connection.getSession();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      // Create a sample deal
      await session.run(
        `CREATE (d:Deal {
          name: 'Apollo acquisition of TechCorp', 
          amount: 500000000,
          stage: 'Closed'
        })`
      );
    } finally {
      await session.close();
    }
  });

  it('should retrieve and format deals when asked to "show deals"', async () => {
    const query = 'show all deals';

    // Mock the OpenAI response for QueryTranslator
    const structuredQueryResponse = {
      command: 'show',
      resourceTypes: ['Deal'],
    };
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
    });

    // Mock the OpenAI response for ChatService (natural language generation)
    const naturalLanguageResponse =
      "I found a deal: 'Apollo acquisition of TechCorp' for $500,000,000, which is currently in the 'Closed' stage.";
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: naturalLanguageResponse },
        },
      ],
    });

    const response = await chatService.handleQuery(testUser, query);

    expect(response).toEqual(naturalLanguageResponse);
    expect(mockOpenAICreate).toHaveBeenCalledTimes(2);

    // Optional: Inspect the first call to ensure QueryTranslator worked
    const queryTranslatorCall = mockOpenAICreate.mock.calls[0][0];
    expect(queryTranslatorCall.messages[1].content).toEqual(query);

    // Optional: Inspect the second call to ensure ChatService got the right data
    const chatServiceCall = mockOpenAICreate.mock.calls[1][0];
    const dataForNLG = JSON.parse(chatServiceCall.messages[1].content.match(/The data I found is: \n\n(.*)/s)[1]);
    
    expect(dataForNLG[0].name).toContain('Apollo acquisition of TechCorp');
    expect(dataForNLG[0].amount.low).toEqual(500000000); // Neo4j driver converts numbers to {low, high}
    expect(dataForNLG[0].stage).toContain('Closed');
  });
}); 