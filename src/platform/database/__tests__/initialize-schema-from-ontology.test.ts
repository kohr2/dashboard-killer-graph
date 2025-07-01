import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '../neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';

describe('Neo4jConnection.initializeSchema', () => {
  it('should generate constraints based on entity labels from ontology', async () => {
    // Arrange: mock ontology service to return custom entities
    const mockEntities = {
      FooEntity: {},
      BarEntity: {},
    } as any;

    jest.spyOn(OntologyService.prototype, 'getAllEntityTypes').mockReturnValue(Object.keys(mockEntities));
    jest
      .spyOn(OntologyService.prototype, 'getIndexableEntityTypes')
      .mockReturnValue([]);

    // Mock session.run to capture Cypher queries
    const runMock = jest.fn().mockResolvedValue({});
    const sessionMock: any = {
      run: runMock,
      close: jest.fn(),
    };

    const conn = new Neo4jConnection();
    jest.spyOn(conn as any, 'getSession').mockReturnValue(sessionMock);

    // Act
    await conn.initializeSchema();

    // Assert: a uniqueness constraint should be created for each mock entity
    const queries = runMock.mock.calls.map((c) => c[0]);
    expect(queries.some((q) => q.includes('FooEntity'))).toBe(true);
    expect(queries.some((q) => q.includes('BarEntity'))).toBe(true);
  });
}); 