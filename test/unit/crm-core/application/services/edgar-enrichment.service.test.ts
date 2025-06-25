import axios from 'axios';
import { EdgarEnrichmentService, EnrichedEdgarData } from '../../../../../src/crm-core/application/services/edgar-enrichment.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EdgarEnrichmentService', () => {
  let service: EdgarEnrichmentService;
  const userAgent = 'Test App test@example.com';

  beforeEach(() => {
    mockedAxios.get.mockClear();
    // The service requires a user agent string for the SEC API
    service = new EdgarEnrichmentService(userAgent);
  });

  it('should enrich an organization with data from the SEC EDGAR API', async () => {
    const organizationName = 'Apple Inc.';
    
    // 1. Mock the response for the CIK lookup
    const mockCikLookupResponse = {
      data: {
        '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' }
      }
    };
    
    // 2. Mock the response for the company data submission
    const mockCompanyDataResponse = {
      data: {
        cik: "320193",
        entityType: "operating",
        sic: "3571",
        sicDescription: "ELECTRONIC COMPUTERS",
        name: "APPLE INC",
        addresses: {
          mailing: {
            street1: "ONE APPLE PARK WAY",
            city: "CUPERTINO",
            stateOrCountry: "CA",
            zipCode: "95014"
          },
          business: {
            street1: "ONE APPLE PARK WAY",
            city: "CUPERTINO",
            stateOrCountry: "CA",
            zipCode: "95014"
          }
        }
      }
    };

    mockedAxios.get
      .mockResolvedValueOnce(mockCikLookupResponse)
      .mockResolvedValueOnce(mockCompanyDataResponse);

    const result = await service.enrichOrganization(organizationName);

    expect(result).toBeDefined();
    expect(result?.name).toEqual('APPLE INC');
    expect(result?.cik).toEqual('320193');
    expect(result?.sic).toEqual('3571');
    expect(result?.sicDescription).toEqual('ELECTRONIC COMPUTERS');
    expect(result?.address.city).toEqual('CUPERTINO');

    // Verify both API calls were made with the correct User-Agent
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), {
      headers: { 'User-Agent': userAgent },
    });
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
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