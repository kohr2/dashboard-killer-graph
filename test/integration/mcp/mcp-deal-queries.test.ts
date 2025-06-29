import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { DealService } from '@platform/deal/deal.service';

describe('DealService Integration Test', () => {
  let connection: Neo4jConnection;
  let dealService: DealService;

  beforeAll(async () => {
    connection = Neo4jConnection.getInstance();
    await connection.connect();
    container.register(Neo4jConnection, { useValue: connection });
    dealService = container.resolve(DealService);
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    const session = connection.getSession();
    try {
      // Clean up database before each test
      await session.run('MATCH (n) DETACH DELETE n');
      // Create a sample deal for testing
      await session.run(
        `CREATE (d:Deal {
          id: 'deal-123', 
          name: 'Project Alpha Acquisition', 
          amount: 1000000, 
          stage: 'Prospecting'
        })`
      );
    } finally {
      await session.close();
    }
  });

  it('should retrieve all deals when no filters are provided', async () => {
    const structuredQuery = {
      command: 'show' as const,
      resourceTypes: ['Deal'],
    };
    const result = await dealService.handleDealQuery(structuredQuery);
    
    expect(result).toBeDefined();
    expect(result).toContain('Project Alpha Acquisition');
    expect(result).toContain('$1,000,000');
  });

  it('should retrieve a specific deal by name filter', async () => {
    const structuredQuery = {
      command: 'show' as const,
      resourceTypes: ['Deal'],
      filters: { name: 'Project Alpha' },
    };
    const result = await dealService.handleDealQuery(structuredQuery);

    expect(result).toBeDefined();
    expect(result).toContain('Project Alpha Acquisition');
    expect(result).not.toContain('Other Deal');
  });

  it('should return a friendly message when no deals are found', async () => {
    const structuredQuery = {
      command: 'show' as const,
      resourceTypes: ['Deal'],
      filters: { name: 'NonExistent Deal' },
    };
    const result = await dealService.handleDealQuery(structuredQuery);

    expect(result).toBeDefined();
    expect(result).toContain('No deals found matching your criteria.');
  });
}); 