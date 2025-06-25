import axios from 'axios';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService, EnrichedEdgarData } from '../../../../../src/crm-core/application/services/edgar-enrichment.service';

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
  let consoleErrorSpy: jest.SpyInstance;
  const userAgent = 'Test App test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EdgarEnrichmentService(userAgent);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('initializeCikMap', () => {
    it('should fetch from SEC and write to cache if cache is empty', async () => {
      // Arrange
      mockedFs.readFile.mockRejectedValue(new Error('Cache not found'));
      const mockCikData = {
        '0': { cik_str: 123, ticker: 'TST', title: 'Test Inc' },
      };
      mockedAxios.get.mockResolvedValue({ data: mockCikData });

      // Act
      await (service as any).initializeCikMap();

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.sec.gov/files/company_tickers.json',
        { headers: { 'User-Agent': userAgent } }
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(mockCikData, null, 2),
        'utf-8'
      );
    });

    it('should load CIK data from cache if it exists', async () => {
      // Arrange
      const mockCikData = {
        '0': { cik_str: 456, ticker: 'CACHE', title: 'Cache Corp' },
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));

      // Act
      await (service as any).initializeCikMap();

      // Assert
      expect(mockedFs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
      expect(mockedAxios.get).not.toHaveBeenCalled();
      
      // On vérifie que la map interne est bien peuplée
      const cik = (service as any).cikMap.get('CACHE CORP');
      expect(cik).toBe(456);
    });
  });

  describe('enrichOrganization', () => {
    beforeEach(async () => {
      // Pré-charge la CIK map pour les tests de cette suite
      const mockCikData = {
        '0': { cik_str: 789, ticker: 'ENRCH', title: 'Enrichment Corp' },
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));
      await (service as any).initializeCikMap();
    });

    it('should return enriched data for a known company', async () => {
      // Arrange
      const mockCompanyData = {
        cik: '789',
        name: 'Enrichment Corp',
        sic: '1234',
        sicDescription: 'Test Industry',
        addresses: {
          business: {
            street1: '123 Main St',
            city: 'Testville',
            stateOrCountry: 'TS',
            zipCode: '12345',
          }
        }
      };
      mockedAxios.get.mockResolvedValue({ data: mockCompanyData });

      // Act
      const result = await service.enrichOrganization('Enrichment Corp');

      // Assert
      const expectedUrl = 'https://data.sec.gov/submissions/CIK0000000789.json';
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, { headers: { 'User-Agent': userAgent } });
      
      expect(result).toEqual({
        name: 'Enrichment Corp',
        cik: '789',
        sic: '1234',
        sicDescription: 'Test Industry',
        address: {
          street1: '123 Main St',
          city: 'Testville',
          stateOrCountry: 'TS',
          zipCode: '12345',
        }
      });
    });

    it('should return null for an unknown company', async () => {
      // Act
      const result = await service.enrichOrganization('Unknown LLC');

      // Assert
      expect(result).toBeNull();
      // On s'assure qu'aucun appel n'a été fait pour les détails
      expect(mockedAxios.get).not.toHaveBeenCalledWith(
        expect.stringContaining('submissions/CIK')
      );
    });
  });

  it('should return null if the organization is not found in the CIK database', async () => {
    const organizationName = 'NonExistent Corp';
    const mockCikLookupResponse = { data: {} }; // Empty response
    mockedAxios.get.mockResolvedValue(mockCikLookupResponse);

    const result = await service.enrichOrganization(organizationName);
    
    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const organizationName = 'Error Corp';
    mockedAxios.get.mockRejectedValue(new Error('Internal Server Error'));

    await expect(service.enrichOrganization(organizationName)).rejects.toThrow(
      'Failed to fetch data from SEC EDGAR API'
    );
  });
}); 