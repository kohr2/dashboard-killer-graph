import axios from 'axios';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '@platform/enrichment';
import { IEnrichmentService, EnrichableEntity } from '@platform/enrichment';
import { OrganizationDTO, createOrganizationDTO } from '@generated/crm';

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
    const baseEntity = createOrganizationDTO({
        id: 'org-1',
        name: 'Enrichment Corp',
        type: 'Organization',
        label: 'Organization',
    });

    it('should return enriched data for a known organization', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Cache miss'));
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockCikData })
        .mockResolvedValueOnce({ data: mockCompanyData });

      const result = await service.enrich(baseEntity);

      expect(result).not.toBeNull();
      expect((result as any).cik).toBe('12345');
      expect((result as any).legalName).toBe('Enrichment Corp');
    });

    it('should return an empty object for an unknown organization', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));
      const unknownEntity = createOrganizationDTO({
        id: 'org-2',
        name: 'Unknown LLC',
        type: 'Organization',
        label: 'Organization',
      });
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
        const notOrg: any = { id: 'x', name: 'NotOrg', type: 'NotOrg' };
        const result = await service.enrich(notOrg as OrganizationDTO);
        expect(result).toEqual({});
    });
  });
}); 