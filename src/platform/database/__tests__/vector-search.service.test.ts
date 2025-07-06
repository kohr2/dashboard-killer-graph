import 'reflect-metadata';
import { container } from 'tsyringe';
import { VectorSearchService } from '../vector-search.service';
import { Neo4jConnection } from '../neo4j-connection';
import neo4j, { Session } from 'neo4j-driver';

describe('VectorSearchService', () => {
  const dummyEmbedding = new Array(384).fill(0.1);
  let service: VectorSearchService;
  let mockSession: jest.Mocked<Session>;
  let mockConn: jest.Mocked<Neo4jConnection>;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } as any;

    mockConn = {
      getSession: jest.fn().mockReturnValue(mockSession),
    } as any;

    container.registerInstance(Neo4jConnection, mockConn as unknown as Neo4jConnection);
    service = container.resolve(VectorSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns top node when score >= threshold', async () => {
    // Arrange
    mockSession.run.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => (key === 'score' ? 0.95 : { id: '123' }),
        },
      ],
    } as any);

    const result = await service.findSimilarNode('Organization', dummyEmbedding, 1, 0.9);
    expect(result).toBeDefined();
    expect(result!.score).toBe(0.95);
  });

  it('returns undefined when no records above threshold', async () => {
    mockSession.run.mockResolvedValueOnce({ records: [] } as any);
    const result = await service.findSimilarNode('Organization', dummyEmbedding, 1, 0.9);
    expect(result).toBeUndefined();
  });
}); 