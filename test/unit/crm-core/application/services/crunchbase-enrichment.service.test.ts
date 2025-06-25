import axios from 'axios';
import { CrunchbaseEnrichmentService, EnrichedOrganization } from '../../../../../src/crm-core/application/services/crunchbase-enrichment.service';

// Mocking the axios module to avoid actual API calls during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CrunchbaseEnrichmentService', () => {
  const apiKey = 'test-api-key';
  let service: CrunchbaseEnrichmentService;

  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.get.mockClear();
    service = new CrunchbaseEnrichmentService(apiKey);
  });

  it('should enrich an organization with data from Crunchbase API', async () => {
    const organizationName = 'Acme Corp';
    const mockApiResponse = {
      data: {
        properties: {
          short_description: 'A leading provider of everything.',
          founded_on: { value: '2020-01-01' },
          num_employees_min: 101,
          num_employees_max: 250,
          website_url: 'http://acme.example.com',
        },
        cards: {
          raised_total: {
            total_funding_usd: 50000000
          }
        }
      },
    };

    mockedAxios.get.mockResolvedValue({ data: mockApiResponse });

    const result = await service.enrichOrganization(organizationName);

    expect(result).toBeDefined();
    expect(result?.name).toEqual(organizationName);
    expect(result?.description).toEqual('A leading provider of everything.');
    expect(result?.foundedYear).toEqual(2020);
    expect(result?.employeeCount).toBe('101-250');
    expect(result?.website).toEqual('http://acme.example.com');
    expect(result?.totalFunding).toEqual(50000000);
    
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `https://api.crunchbase.com/api/v4/entities/organizations/${organizationName}?card_uuids=raised_total`,
      {
        headers: {
          'X-cb-user-key': apiKey,
          'Accept': 'application/json',
        },
      }
    );
  });

  it('should return null if the organization is not found (404)', async () => {
    const organizationName = 'NonExistent Corp';
    mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

    const result = await service.enrichOrganization(organizationName);

    expect(result).toBeNull();
  });

  it('should throw an error for other API issues (e.g., 500)', async () => {
    const organizationName = 'Error Corp';
    mockedAxios.get.mockRejectedValue(new Error('Internal Server Error'));

    await expect(service.enrichOrganization(organizationName)).rejects.toThrow(
      'Failed to fetch data from Crunchbase API'
    );
  });
}); 