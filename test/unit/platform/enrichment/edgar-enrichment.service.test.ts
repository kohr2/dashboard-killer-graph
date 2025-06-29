import axios from 'axios';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '@platform/enrichment';
import { IEnrichmentService, EnrichableEntity } from '@platform/enrichment';
import { Organization } from '@crm/domain/entities/organization';

jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('EdgarEnrichmentService', () => {
  let service: IEnrichmentService;
  const userAgent = 'Test User Agent';
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EdgarEnrichmentService(userAgent);
    // We only spy on console.error as the new service is quieter on success
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('enrich', () => {
    const mockCikData = { '0': { cik_str: 12345, ticker: 'ENRCH', title: 'Enrichment Corp' } };
    const mockCompanyData = {
      name: 'Enrichment Corp',
      cik: '12345',
      sic: '1234',
      sicDescription: 'Test Industry',
      addresses: { business: { street1: '123 Test St', city: 'Testville', stateOrCountry: 'TS', zipCode: '12345' } },
    };
    const baseEntity: Organization = new Organization(
        'org-1',
        'Enrichment Corp'
    );

    it('should return enriched data for a known organization', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Cache miss'));
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockCikData })
        .mockResolvedValueOnce({ data: mockCompanyData });

      const result = await service.enrich(baseEntity);

      expect(result).not.toBeNull();
      expect(result?.cik).toBe('12345');
      expect(result?.legalName).toBe('Enrichment Corp');
    });

    it('should return an empty object for an unknown organization', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));
      const unknownEntity: Organization = new Organization('org-2', 'Unknown LLC');
      const result = await service.enrich(unknownEntity);
      expect(result).toEqual({});
    });
    
    it('should return an empty object and log an error if initialization fails', async () => {
        mockedFs.readFile.mockRejectedValue(new Error('Failed to read cache'));
        mockedAxios.get.mockRejectedValue(new Error('Failed to fetch from SEC'));

        const result = await service.enrich(baseEntity);
        expect(result).toEqual({});
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize'));
    });

    it('should not enrich entities that are not Organizations', async () => {
        const personEntity: EnrichableEntity = { id: 'p-1', name: 'John Doe', label: 'Person' } as any;
        const result = await service.enrich(personEntity);
        expect(result).toEqual({});
    });
  });
}); 