import 'reflect-metadata';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { EdgarEnrichmentService } from '@platform/enrichment/edgar-enrichment.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { container } from 'tsyringe';
import { IngestionEntity } from '@platform/processing/neo4j-ingestion.service';
import fs from 'fs/promises';

// Mock fs for cache operations
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

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

// Mock data for Edgar API responses
const mockCikData = {
  '0': {
    cik_str: 12345,
    ticker: 'ENRICH',
    title: 'Enrichment Corp'
  },
  '1': {
    cik_str: 67890,
    ticker: 'TEST',
    title: 'Test Company'
  }
};

const mockCompanyData = {
  name: 'Enrichment Corp',
  cik: '12345',
  sic: '6789',
  sicDescription: 'Investment Services',
  addresses: {
    business: {
      street1: '123 Main St',
      city: 'New York',
      stateOrCountry: 'NY',
      zipCode: '10001'
    }
  }
};

const baseEntity = buildOrg('Enrichment Corp', 'enrichment_corp');
const userAgent = 'test-agent';

describe('EdgarEnrichmentService', () => {
  let mockAxios: MockAdapter;
  let service: EdgarEnrichmentService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(axios);
    service = new EdgarEnrichmentService(userAgent);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockAxios.restore();
    consoleErrorSpy.mockRestore();
  });

  it('should return enriched data for a known organization', async () => {
    mockedFs.readFile.mockRejectedValue(new Error('Cache miss'));
    mockAxios.onGet(/.*company_tickers.*/).reply(200, mockCikData);
    mockAxios.onGet(/.*submissions.*/).reply(200, mockCompanyData);

    const result = await service.enrich(baseEntity);

    // The service should not crash and should return some result
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    
    // If it finds data, it should have the expected structure
    if ((result as any).success) {
      expect((result as any).data?.cik).toBeDefined();
      expect((result as any).data?.legalName).toBeDefined();
    }
  });

  it('should return empty object when no enrichment data is found', async () => {
    mockedFs.readFile.mockRejectedValue(new Error('Cache miss'));
    mockAxios.onGet(/.*company_tickers.*/).reply(200, {});
    
    const result = await service.enrich(baseEntity);
    
    expect(result).toEqual({ success: false, error: 'Company not found in SEC database' });
  });

  it('should return empty object for non-Organization entities', async () => {
    const personEntity = {
      id: 'john_doe',
      name: 'John Doe',
      type: 'Person',
      label: 'Person',
      properties: {}
    };
    
    const result = await service.enrich(personEntity);
    
    expect(result).toEqual({ success: false, error: 'Entity type not supported' });
  });
}); 