import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { OntologyService } from '@platform/ontology/ontology.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import OpenAI from 'openai';

jest.mock('openai');

const mockOpenAICreate = jest.fn();
(OpenAI as unknown as jest.Mock).mockImplementation(() => ({
  chat: { completions: { create: mockOpenAICreate } },
}));

const testUser: User = {
  id: 'test-user',
  username: 'test-user',
  roles: [{ name: 'admin', permissions: [] }],
};

describe('ChatService Deal Queries Integration Test', () => {
  let connection: Neo4jConnection;
  let chatService: ChatService;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = 'test-key';

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
    await session.run('MATCH (n) DETACH DELETE n');
    await session.run(
      `CREATE (d:Deal {name: 'Apollo acquisition of TechCorp', amount: 500000000, stage: 'Closed'})`,
    );
    await session.close();
  });

  it('should retrieve and format deals when asked to "show deals"', async () => {
    const query = 'show all deals';

    const structuredQueryResponse = { command: 'show', resourceTypes: ['Deal'] };
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(structuredQueryResponse) } }],
    });

    const naturalLanguageResponse =
      "I found a deal: 'Apollo acquisition of TechCorp' for $500,000,000, which is currently in the 'Closed' stage.";
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: naturalLanguageResponse } }],
    });

    const response = await chatService.handleQuery(testUser, query);

    expect(response).toEqual(naturalLanguageResponse);
    expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
  });
}); 