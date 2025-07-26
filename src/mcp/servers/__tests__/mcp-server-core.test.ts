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

describe('MCP Server Core', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should initialize core services successfully', async () => {
    const mockContainer = {
      resolve: jest.fn(),
    };

    const mockBootstrap = jest.fn();
    const mockNeo4jConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    };

    // Set up the mocks before importing
    jest.doMock('tsyringe', () => ({
      container: mockContainer,
      injectable: () => (constructor: any) => constructor,
      singleton: () => (constructor: any) => constructor,
    }));

    jest.doMock('../../../bootstrap', () => ({
      bootstrap: mockBootstrap,
    }));

    // Set up container.resolve to return our mocks
    mockContainer.resolve
      .mockReturnValueOnce(mockOntologyService)
      .mockReturnValueOnce(mockChatService)
      .mockReturnValueOnce(mockNeo4jConnection);

    // Now import the module
    const { initializeCoreServices } = await import('../mcp-server-core');
    
    const result = await initializeCoreServices();

    expect(mockBootstrap).toHaveBeenCalled();
    expect(mockNeo4jConnection.connect).toHaveBeenCalled();
    expect(result).toEqual({
      ontologyService: mockOntologyService,
      chatService: mockChatService,
      neo4jConnection: mockNeo4jConnection,
    });
  });

  it('should throw an error if neo4j connection fails', async () => {
    const mockContainer = {
      resolve: jest.fn(),
    };

    const mockBootstrap = jest.fn();
    const mockNeo4jConnection = {
      connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
      close: jest.fn(),
    };

    // Set up the mocks before importing
    jest.doMock('tsyringe', () => ({
      container: mockContainer,
      injectable: () => (constructor: any) => constructor,
      singleton: () => (constructor: any) => constructor,
    }));

    jest.doMock('../../../bootstrap', () => ({
      bootstrap: mockBootstrap,
    }));

    // Set up container.resolve to return our mocks
    mockContainer.resolve
      .mockReturnValueOnce(mockOntologyService)
      .mockReturnValueOnce(mockChatService)
      .mockReturnValueOnce(mockNeo4jConnection);

    // Now import the module
    const { initializeCoreServices } = await import('../mcp-server-core');
    
    await expect(initializeCoreServices()).rejects.toThrow('Connection failed');
  });
}); 