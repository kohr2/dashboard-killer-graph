// Comprehensive Jest mock type declarations
declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> {
      mockResolvedValue(value: T): Mock<Promise<T>, Y>;
      mockResolvedValueOnce(value: T): Mock<Promise<T>, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockReturnValueOnce(value: T): Mock<T, Y>;
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockImplementationOnce(fn: (...args: Y) => T): Mock<T, Y>;
    }
  }
}

// Mock session type for Neo4j
interface MockSession {
  run: jest.Mock<Promise<{ records: any[] }>>;
  close: jest.Mock<Promise<void>>;
}

// Mock connection type for Neo4j
interface MockNeo4jConnection {
  switchDatabase: jest.Mock<Promise<void>>;
  getSession: jest.Mock<MockSession>;
  getDatabase: jest.Mock<string>;
  connect: jest.Mock<Promise<void>>;
  close: jest.Mock<Promise<void>>;
  initializeSchema: jest.Mock<Promise<void>>;
  clearDatabase: jest.Mock<Promise<void>>;
  listDatabases: jest.Mock<Promise<string[]>>;
  dropDatabase: jest.Mock<Promise<void>>;
  findSimilarOrganizationEmbedding: jest.Mock<Promise<any[]>>;
}

// Mock query translator type
interface MockQueryTranslator {
  translate: jest.Mock<Promise<{
    command: string;
    resourceTypes: string[];
  }>>;
}

export {}; 