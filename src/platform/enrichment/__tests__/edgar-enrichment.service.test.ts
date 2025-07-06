import 'reflect-metadata';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { EdgarEnrichmentService } from '@platform/enrichment/edgar-enrichment.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { container } from 'tsyringe';
import { IngestionEntity } from '@platform/processing/neo4j-ingestion.service';

// Helper to create a mock Organization entity
function buildOrg(name: string, id: string, embedding?: number[]): IngestionEntity {
  return {
    id,
    name,
    type: 'Organization',
    label: 'Organization',
    properties: {},
    embedding,
  } as any;
}

describe('EdgarEnrichmentService', () => {
  let mockAxios: MockAdapter;
  let service: EdgarEnrichmentService;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    service = new EdgarEnrichmentService(axios);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  it('returns CIK and metadata when SEC API recognises the company', async () => {
    mockAxios
      .onGet(/search-api/)
      .reply(200, { cik_str: '0000320193', entityType: 'Operating', name: 'Apple Inc.' });

    const entity = buildOrg('Apple Inc.', 'apple_inc');
    const result = await service.enrich(entity);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as any).cik).toBe('0000320193');
  });

  it('reuses existing enriched metadata via vector search when similarity is high', async () => {
    // Mock vector search helper: assume Neo4j returns an existing node with metadata
    const mockNeo4j = {
      findSimilarOrganizationEmbedding: jest.fn().mockResolvedValue({
        properties: { cik: '1234567890', source: 'edgar' },
      }),
    } as unknown as Neo4jConnection;
    container.registerInstance(Neo4jConnection, mockNeo4j);

    const embedding = new Array(384).fill(0.5);
    const entity = buildOrg('Acme Corp', 'acme', embedding);

    const result = await service.enrich(entity);

    expect(mockNeo4j.findSimilarOrganizationEmbedding).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect((result.data as any).cik).toBe('1234567890');
  });
}); 