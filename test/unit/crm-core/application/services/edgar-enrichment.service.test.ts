
import axios from 'axios';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../../../../src/crm-core/application/services/edgar-enrichment.service';

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
    beforeEach(async () => {
      const mockCikData = {
        '0': { cik_str: 789, ticker: 'ENRCH', title: 'Enrichment Corp' },
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCikData));
      // Pas d'appel à initializeCikMap ici pour mieux contrôler les mocks
    });

    it('should return null for an unknown company', async () => {
      await (service as any).initializeCikMap(); // On initialise ici
      const result = await service.enrichOrganization('Unknown LLC');
      expect(result).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringContaining('submissions/CIK'));
    });

    it('should handle API errors gracefully', async () => {
      await (service as any).initializeCikMap(); // On initialise
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      await expect(service.enrichOrganization('Enrichment Corp')).rejects.toThrow('Failed to fetch data from SEC EDGAR API');
    });
  });
});

