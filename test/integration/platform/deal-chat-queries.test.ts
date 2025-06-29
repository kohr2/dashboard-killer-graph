import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { OntologyService } from '@platform/ontology/ontology.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';

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
    // Setup dependency injection container
    const ontologyService = new OntologyService();
    const queryTranslator = new QueryTranslator(ontologyService);
    const accessControl = new AccessControlService();
    connection = Neo4jConnection.getInstance();

    container.register(Neo4jConnection, { useValue: connection });
    container.register(OntologyService, { useValue: ontologyService });
    container.register(AccessControlService, { useValue: accessControl });
    container.register(QueryTranslator, { useValue: queryTranslator });
    
    chatService = container.resolve(ChatService);
    
    await connection.connect();
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
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
    const response = await chatService.handleQuery(testUser, query);

    expect(response).toBeDefined();
    expect(response).toContain('Apollo acquisition of TechCorp');
    expect(response).toContain('$500,000,000');
    expect(response).toContain('Closed');
  });
}); 