import { OntologyService } from '../../../platform/ontology/ontology.service';
import { ChatService } from '../../../platform/chat/chat.service';
import { Neo4jConnection } from '../../../platform/database/neo4j-connection';
import { ReasoningOrchestratorService } from '../../../platform/reasoning/reasoning-orchestrator.service';

// Define mocks for services
const mockOntologyService = {
  getAllEntityTypes: jest.fn(),
  getAllRelationshipTypes: jest.fn(),
};

const mockChatService = {
  handleQuery: jest.fn(),
};

const mockNeo4jConnection = {
  connect: jest.fn(),
  close: jest.fn(),
};

const mockReasoningOrchestratorService = {};

const setupMocks = (neo4jConnectImpl?: () => Promise<void>) => {
  const mockContainer = {
    resolve: jest.fn(),
  };

  jest.mock('tsyringe', () => ({
    container: mockContainer,
    injectable: () => (constructor: any) => constructor,
    singleton: () => (constructor: any) => constructor,
  }));

  jest.mock('../../../bootstrap', () => ({
    bootstrap: jest.fn(),
  }));

  const neo4jMock = {
    connect: neo4jConnectImpl
      ? jest.fn(neo4jConnectImpl)
      : jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  };

  // The order of resolution in initializeCoreServices is Neo4j, Ontology, Chat.
  mockContainer.resolve
    .mockReturnValueOnce(neo4jMock) // For Neo4jConnection
    .mockReturnValueOnce(mockOntologyService) // For OntologyService
    .mockReturnValueOnce(mockChatService); // For ChatService

  return { neo4jMock };
};

describe('MCP Server Core', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should initialize core services successfully', async () => {
    setupMocks();
    const { initializeCoreServices } = await import('../mcp-server-core');
    await initializeCoreServices();

    const { container } = jest.requireMock('tsyringe');
    const { bootstrap } = jest.requireMock('../../../bootstrap');

    expect(bootstrap).toHaveBeenCalled();

    const neo4jMock = (container.resolve as jest.Mock).mock.results.find(
      res => res.value.connect,
    )?.value;
    expect(neo4jMock.connect).toHaveBeenCalled();
  });

  it('should throw an error if neo4j connection fails', async () => {
    setupMocks(() => Promise.reject(new Error('Connection failed')));
    const { initializeCoreServices } = await import('../mcp-server-core');
    await expect(initializeCoreServices()).rejects.toThrow('Connection failed');
  });
}); 