import axios from 'axios';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../../../src/ontologies/crm/application/services/edgar-enrichment.service';

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
  let service: EdgarEnrichmentService;
  const userAgent = 'Test User Agent';
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EdgarEnrichmentService(userAgent);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ... (Je saute les tests de initializeCikMap pour la simplicité)

  describe('enrichOrganization', () => {
    const mockCikData = {
      '0': { cik_str: 12345, ticker: 'ENRCH', title: 'Enrichment Corp' },
    };
    const mockCompanyData = {
      name: 'Enrichment Corp',
      cik: '12345',
      sic: '1234',
      sicDescription: 'Test Industry',
      addresses: {
        business: {
          street1: '123 Test St',
          city: 'Testville',
          stateOrCountry: 'TS',
          zipCode: '12345',
        },
      },
    };

    it('should return enriched data for a known company', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Cache miss')); // Force fetch
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockCikData }) // For CIK lookup
        .mockResolvedValueOnce({ data: mockCompanyData }); // For company data

      const result = await service.enrichOrganization('Enrichment Corp');

      expect(result).not.toBeNull();
      expect(result?.cik).toBe('12345');
      expect(result?.name).toBe('Enrichment Corp');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should return null for an unknown company', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData)); // Cache hit

      const result = await service.enrichOrganization('Unknown LLC');

      expect(result).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled(); // Should not fetch company data
    });

    it('should handle API errors gracefully and return null', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData)); // Cache hit
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await service.enrichOrganization('Enrichment Corp');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('initializeCikMap (caching)', () => {
    const mockCikData = {
      '0': { cik_str: 123, ticker: 'TST', title: 'Test Inc' },
    };

    it('should load CIK data from cache if available', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));

      // Call a method that triggers initialization
      await service.enrichOrganization('Some Company');

      expect(mockedFs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('should fetch from SEC and write to cache on cache miss', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Cache file not found'));
      mockedAxios.get.mockResolvedValue({ data: mockCikData });

      await service.enrichOrganization('Some Company');

      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('company_tickers.json'), expect.any(Object));
      expect(mockedFs.writeFile).toHaveBeenCalledWith(expect.any(String), JSON.stringify(mockCikData, null, 2), 'utf-8');
    });

    it('should throw an error if both cache and SEC fetch fail', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Cache file not found'));
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.enrichOrganization('Some Company')).rejects.toThrow('Failed to fetch or process data from SEC EDGAR API');
    });
  });
});

